<?php

namespace App\Jobs;

use App\Mail\SaleTicketMail;
use App\Models\Business;
use App\Models\Sale;
use App\Models\SaleTicketEmailStatus;
use App\Services\BusinessSmtpRuntimeConfigurator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class SendSaleTicketEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private readonly int $saleId,
        private readonly int $businessId,
        private readonly string $toEmail,
        private readonly ?string $subject,
        private readonly ?string $message,
        private readonly string $pdfPath,
        private readonly string $pdfFilename,
        private readonly string $requestId,
    ) {}

    public function handle(BusinessSmtpRuntimeConfigurator $smtpRuntimeConfigurator): void
    {
        $sale = Sale::find($this->saleId);
        $business = Business::with('smtpSettings')->find($this->businessId);
        $statusRecord = SaleTicketEmailStatus::query()->where('request_id', $this->requestId)->first();

        if (!$sale || !$business || !$statusRecord || !Storage::disk('local')->exists($this->pdfPath)) {
            $this->updateStatus('failed', 'No se pudo preparar el envío del ticket por e-mail.');

            return;
        }

        $smtpValidation = $smtpRuntimeConfigurator->validateActiveAndCompleteConfig($business);
        if (!$smtpValidation['valid']) {
            $this->updateStatus('failed', $smtpValidation['message'] ?? 'La configuración SMTP no es válida.');

            return;
        }

        $smtpRuntimeConfigurator->apply($smtpValidation['config']);

        $pdfContent = Storage::disk('local')->get($this->pdfPath);

        if ($pdfContent === null || $pdfContent === false || $pdfContent === '') {
            $this->updateStatus('failed', 'No se pudo leer el archivo PDF del ticket.');

            return;
        }

        try {
            Mail::mailer('smtp')->to($this->toEmail)->send(new SaleTicketMail(
                sale: $sale,
                clientPdfContent: $pdfContent,
                clientPdfFilename: $this->pdfFilename,
                customMessage: $this->message,
                customSubject: $this->subject,
            ));

            $this->updateStatus('sent', null);
        } catch (\Throwable $exception) {
            Log::warning('sale_ticket_email_job_failed', [
                'sale_id' => $this->saleId,
                'business_id' => $this->businessId,
                'request_id' => $this->requestId,
                'error' => $exception->getMessage(),
            ]);

            $this->updateStatus('failed', 'No se pudo enviar el ticket por email.');
        } finally {
            Storage::disk('local')->delete($this->pdfPath);
        }
    }

    private function updateStatus(string $status, ?string $errorMessage): void
    {
        SaleTicketEmailStatus::query()
            ->where('request_id', $this->requestId)
            ->update([
                'status' => $status,
                'error_message' => $errorMessage,
                'processed_at' => now(),
                'updated_at' => now(),
            ]);
    }
}
