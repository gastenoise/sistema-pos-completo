<?php

namespace App\Http\Controllers;

use App\Mail\SaleTicketMail;
use App\Models\Business;
use App\Models\Sale;
use App\Services\BusinessContext;
use App\Services\BusinessSmtpRuntimeConfigurator;
use App\Services\SaleTicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SaleTicketController extends Controller
{
    private const MAX_TICKET_PDF_BYTES = 5242880;

    public function __construct(
        private readonly BusinessContext $businessContext,
        private readonly SaleTicketService $saleTicketService,
        private readonly BusinessSmtpRuntimeConfigurator $smtpRuntimeConfigurator,
    ) {}

    public function show(Sale $sale): JsonResponse
    {
        if ($response = $this->validateBusinessAccess($sale)) {
            return $response;
        }

        return response()->json([
            'success' => true,
            'data' => $this->saleTicketService->build($sale),
        ]);
    }

    /**
     * @deprecated El PDF debe ser generado por el front-end usando la data de show().
     */
    public function pdf(Sale $sale): JsonResponse
    {
        if ($response = $this->validateBusinessAccess($sale)) {
            return $response;
        }

        return response()->json([
            'success' => false,
            'message' => 'El endpoint /ticket/pdf está obsoleto. Usá /ticket para obtener los datos y renderizar el PDF en front-end.',
        ], 410);
    }

    /**
     * @deprecated Ruta firmada obsoleta junto al flujo legacy de PDF backend.
     */
    public function downloadSigned(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'La descarga firmada del PDF está obsoleta. Generá el PDF en front-end con datos de /ticket.',
        ], 410);
    }

    public function email(Request $request, Sale $sale): JsonResponse
    {
        if ($response = $this->validateBusinessAccess($sale)) {
            return $response;
        }

        $validated = $request->validate([
            'to_email' => 'required|email',
            'subject' => 'nullable|string|max:255',
            'message' => 'nullable|string',
            'ticket_pdf' => 'required|file|mimetypes:application/pdf|max:5120',
        ]);

        $business = Business::find($sale->business_id);
        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found',
            ], 404);
        }

        [$pdfContent, $pdfFilename, $fileMetadata] = $this->resolveClientPdfPayload($request, $sale);

        if (!$pdfContent || !$pdfFilename) {
            $this->logEmailAudit($sale, $business->id, $validated['to_email'], 'invalid_pdf_payload');

            return response()->json([
                'success' => false,
                'message' => 'Debés enviar un PDF válido en ticket_pdf (multipart/form-data).',
            ], 422);
        }

        $smtpValidation = $this->smtpRuntimeConfigurator->validateActiveAndCompleteConfig($business);
        if (!$smtpValidation['valid']) {
            $this->logEmailAudit($sale, $business->id, $validated['to_email'], 'smtp_invalid', [
                'file' => $fileMetadata,
            ]);

            return response()->json([
                'success' => false,
                'message' => $smtpValidation['message'],
            ], 422);
        }

        $this->smtpRuntimeConfigurator->apply($smtpValidation['config']);

        try {
            Mail::mailer('smtp')->to($validated['to_email'])->send(new SaleTicketMail(
                sale: $sale,
                clientPdfContent: $pdfContent,
                clientPdfFilename: $pdfFilename,
                customMessage: $validated['message'] ?? null,
                customSubject: $validated['subject'] ?? null,
            ));

            $this->logEmailAudit($sale, $business->id, $validated['to_email'], 'sent', [
                'file' => $fileMetadata,
            ]);
        } catch (\Throwable $exception) {
            $this->logEmailAudit($sale, $business->id, $validated['to_email'], 'failed', [
                'error' => $exception->getMessage(),
                'file' => $fileMetadata,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'No se pudo enviar el ticket por email.',
                'error' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Ticket enviado correctamente por email.',
        ]);
    }

    public function uploadWhatsappFile(Request $request, Sale $sale): JsonResponse
    {
        if ($response = $this->validateBusinessAccess($sale)) {
            return $response;
        }

        $request->validate([
            'pdf_file' => 'required|file|mimetypes:application/pdf|max:5120',
        ]);

        $file = $request->file('pdf_file');

        if (!$file || !$file->isValid()) {
            return response()->json([
                'success' => false,
                'message' => 'No se recibió un archivo PDF válido.',
            ], 422);
        }

        $storedFilename = sprintf('sale-%d-%s.pdf', $sale->id, Str::lower(Str::random(16)));
        $relativePath = $file->storeAs('tickets/whatsapp-temp', $storedFilename, 'public');

        return response()->json([
            'success' => true,
            'data' => [
                'file_url' => Storage::disk('public')->url($relativePath),
                'path' => $relativePath,
            ],
        ]);
    }

    public function shareWhatsapp(Request $request, Sale $sale): JsonResponse
    {
        if ($response = $this->validateBusinessAccess($sale)) {
            return $response;
        }

        $sale->loadMissing('business');

        $validated = $request->validate([
            'file_url' => 'nullable|url|max:2048',
        ]);

        $shareText = $this->buildWhatsappShareText($sale, $validated['file_url'] ?? null);

        return response()->json([
            'success' => true,
            'data' => [
                'share_text' => $shareText,
                'file_url' => $validated['file_url'] ?? null,
                'whatsapp_url' => sprintf('https://wa.me/?text=%s', rawurlencode($shareText)),
                'channel_notice' => 'WhatsApp no permite adjuntar archivos automáticamente desde este enlace. Si hay URL del ticket, compartila manualmente al abrir el chat.',
            ],
        ]);
    }

    private function validateBusinessAccess(Sale $sale): ?JsonResponse
    {
        $businessId = $this->businessContext->getBusinessId();

        if (is_null($businessId) || (int) $sale->business_id !== (int) $businessId) {
            return response()->json([
                'success' => false,
                'message' => 'Sale does not belong to the current business context.',
            ], 403);
        }

        return null;
    }

    private function logEmailAudit(Sale $sale, int $businessId, string $recipient, string $status, array $extra = []): void
    {
        Log::info('sale_ticket_email_audit', array_merge([
            'sale_id' => $sale->id,
            'business_id' => $businessId,
            'recipient' => $recipient,
            'status' => $status,
        ], $extra));
    }

    /**
     * @return array{0:?string,1:?string,2:array<string,mixed>}
     */
    private function resolveClientPdfPayload(Request $request, Sale $sale): array
    {
        if (!$request->hasFile('ticket_pdf')) {
            return [null, null, []];
        }

        $file = $request->file('ticket_pdf');

        if (!$file || !$file->isValid() || $file->getMimeType() !== 'application/pdf') {
            return [null, null, []];
        }

        $content = $file->get();
        if ($content === false || strlen($content) === 0 || strlen($content) > self::MAX_TICKET_PDF_BYTES) {
            return [null, null, []];
        }

        $filename = $file->getClientOriginalName() ?: sprintf('ticket-venta-%d.pdf', $sale->id);
        $normalizedFilename = $this->normalizePdfFilename($filename, $sale);

        return [
            $content,
            $normalizedFilename,
            [
                'source' => 'multipart',
                'filename' => $normalizedFilename,
                'size_bytes' => strlen($content),
                'mime_type' => $file->getMimeType(),
                'sha256' => hash('sha256', $content),
            ],
        ];
    }

    private function normalizePdfFilename(?string $filename, Sale $sale): string
    {
        $fallback = sprintf('ticket-venta-%d.pdf', $sale->id);

        if (!$filename || trim($filename) === '') {
            return $fallback;
        }

        $clean = trim(str_replace(["\0", '/', '\\'], '', $filename));

        if (!str_ends_with(strtolower($clean), '.pdf')) {
            $clean .= '.pdf';
        }

        return $clean !== '' ? $clean : $fallback;
    }

    private function buildWhatsappShareText(Sale $sale, ?string $fileUrl = null): string
    {
        $businessName = $sale->business?->name ?? 'Negocio';
        $ticketDate = optional($sale->closed_at ?? $sale->created_at)->format('Y-m-d H:i:s');
        $totalAmount = number_format((float) $sale->total_amount, 2, '.', '');

        return implode("\n", [
            sprintf('%s te comparte tu ticket.', $businessName),
            sprintf('Ticket: #%d', $sale->id),
            sprintf('Fecha: %s', $ticketDate),
            sprintf('Total: %s', $totalAmount),
            $fileUrl ? sprintf('PDF: %s', $fileUrl) : 'PDF: se enviará sin adjunto automático en WhatsApp.',
        ]);
    }
}
