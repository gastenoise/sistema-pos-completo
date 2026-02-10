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
            'pdf_file' => 'nullable|file|mimetypes:application/pdf|max:5120',
            'pdf_base64' => 'nullable|string',
            'pdf_filename' => 'nullable|string|max:255',
        ]);

        $business = Business::find($sale->business_id);
        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found',
            ], 404);
        }

        [$pdfContent, $pdfFilename, $fileMetadata] = $this->resolveClientPdfPayload($request, $validated, $sale);

        if (!$pdfContent || !$pdfFilename) {
            $this->logEmailAudit($sale, $business->id, $validated['to_email'], 'invalid_pdf_payload');

            return response()->json([
                'success' => false,
                'message' => 'Debés enviar un PDF válido en pdf_file (multipart/form-data) o pdf_base64.',
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

    public function shareWhatsapp(Sale $sale): JsonResponse
    {
        if ($response = $this->validateBusinessAccess($sale)) {
            return $response;
        }

        $sale->loadMissing('business');

        $shareText = $this->buildWhatsappShareText($sale);

        return response()->json([
            'success' => true,
            'data' => [
                'share_text' => $shareText,
                'whatsapp_url' => sprintf('https://wa.me/?text=%s', rawurlencode($shareText)),
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
     * @param array<string,mixed> $validated
     * @return array{0:?string,1:?string,2:array<string,mixed>}
     */
    private function resolveClientPdfPayload(Request $request, array $validated, Sale $sale): array
    {
        if ($request->hasFile('pdf_file')) {
            $file = $request->file('pdf_file');

            if (!$file || !$file->isValid() || $file->getMimeType() !== 'application/pdf') {
                return [null, null, []];
            }

            $content = $file->get();
            if ($content === false || strlen($content) > self::MAX_TICKET_PDF_BYTES) {
                return [null, null, []];
            }

            $filename = $file->getClientOriginalName() ?: sprintf('ticket-venta-%d.pdf', $sale->id);

            return [
                $content,
                $this->normalizePdfFilename($filename, $sale),
                [
                    'source' => 'multipart',
                    'filename' => $this->normalizePdfFilename($filename, $sale),
                    'size_bytes' => strlen($content),
                    'mime_type' => $file->getMimeType(),
                    'sha256' => hash('sha256', $content),
                ],
            ];
        }

        $base64 = $validated['pdf_base64'] ?? null;
        if (!is_string($base64) || trim($base64) === '') {
            return [null, null, []];
        }

        $mime = 'application/pdf';
        $payload = trim($base64);

        if (str_starts_with($payload, 'data:')) {
            if (!preg_match('/^data:(?<mime>[\w\/+\-.]+);base64,(?<data>.+)$/', $payload, $matches)) {
                return [null, null, []];
            }

            $mime = $matches['mime'] ?? '';
            $payload = $matches['data'] ?? '';
        }

        $content = base64_decode($payload, true);

        if ($content === false || strlen($content) === 0 || strlen($content) > self::MAX_TICKET_PDF_BYTES) {
            return [null, null, []];
        }

        if ($mime !== 'application/pdf' || !str_starts_with($content, '%PDF')) {
            return [null, null, []];
        }

        $filename = $this->normalizePdfFilename(
            $validated['pdf_filename'] ?? sprintf('ticket-venta-%d.pdf', $sale->id),
            $sale,
        );

        return [
            $content,
            $filename,
            [
                'source' => 'base64',
                'filename' => $filename,
                'size_bytes' => strlen($content),
                'mime_type' => $mime,
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

    private function buildWhatsappShareText(Sale $sale): string
    {
        $businessName = $sale->business?->name ?? 'Negocio';
        $ticketDate = optional($sale->closed_at ?? $sale->created_at)->format('Y-m-d H:i:s');
        $totalAmount = number_format((float) $sale->total_amount, 2, '.', '');

        return implode("\n", [
            sprintf('%s te comparte tu ticket.', $businessName),
            sprintf('Ticket: #%d', $sale->id),
            sprintf('Fecha: %s', $ticketDate),
            sprintf('Total: %s', $totalAmount),
            'PDF: adjunto en el email o generado en front-end.',
        ]);
    }
}
