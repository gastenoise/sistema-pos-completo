<?php

namespace App\Http\Controllers;

use App\Mail\SaleTicketMail;
use App\Models\Business;
use App\Models\Sale;
use App\Services\BusinessContext;
use App\Services\BusinessSmtpRuntimeConfigurator;
use App\Services\SaleTicketPdfService;
use App\Services\SaleTicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\Response;

class SaleTicketController extends Controller
{
    public function __construct(
        private readonly BusinessContext $businessContext,
        private readonly SaleTicketService $saleTicketService,
        private readonly SaleTicketPdfService $saleTicketPdfService,
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

    public function pdf(Request $request, Sale $sale): Response|JsonResponse
    {
        if ($response = $this->validateBusinessAccess($sale)) {
            return $response;
        }

        return $this->saleTicketPdfService->render(
            sale: $sale,
            download: $request->boolean('download'),
        );
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
        ]);

        $business = Business::find($sale->business_id);
        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found',
            ], 404);
        }

        $smtpValidation = $this->smtpRuntimeConfigurator->validateActiveAndCompleteConfig($business);
        if (!$smtpValidation['valid']) {
            $this->logEmailAudit($sale, $business->id, $validated['to_email'], 'smtp_invalid');

            return response()->json([
                'success' => false,
                'message' => $smtpValidation['message'],
            ], 422);
        }

        $this->smtpRuntimeConfigurator->apply($smtpValidation['config']);

        try {
            $ticketPdf = $this->saleTicketPdfService->generate($sale);

            Mail::mailer('smtp')->to($validated['to_email'])->send(new SaleTicketMail(
                sale: $sale,
                pdfContent: $ticketPdf['content'],
                pdfFilename: $ticketPdf['filename'],
                customMessage: $validated['message'] ?? null,
                customSubject: $validated['subject'] ?? null,
            ));

            $this->logEmailAudit($sale, $business->id, $validated['to_email'], 'sent');
        } catch (\Throwable $exception) {
            $this->logEmailAudit($sale, $business->id, $validated['to_email'], 'failed', [
                'error' => $exception->getMessage(),
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
}
