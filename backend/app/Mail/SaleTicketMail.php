<?php

namespace App\Mail;

use App\Models\Sale;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SaleTicketMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        private readonly Sale $sale,
        private readonly string $clientPdfContent,
        private readonly string $clientPdfFilename,
        private readonly ?string $customMessage = null,
        private readonly ?string $customSubject = null,
    ) {}

    public function build(): static
    {
        return $this
            ->subject($this->customSubject ?: sprintf('Ticket de venta #%d', $this->sale->id))
            ->text('emails.sale_ticket')
            ->with([
                'saleId' => $this->sale->id,
                'messageBody' => $this->customMessage,
            ])
            ->attachData($this->clientPdfContent, $this->clientPdfFilename, [
                'mime' => 'application/pdf',
            ]);
    }
}
