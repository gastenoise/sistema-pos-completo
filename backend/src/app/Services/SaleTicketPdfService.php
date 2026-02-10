<?php

namespace App\Services;

use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

class SaleTicketPdfService
{
    public function __construct(
        private readonly SaleTicketService $saleTicketService,
    ) {}

    public function render(Sale $sale, bool $download = false): Response
    {
        $ticket = $this->saleTicketService->build($sale);
        $filename = sprintf('ticket-venta-%d.pdf', $sale->id);

        $pdf = Pdf::loadView('tickets.sale', [
            'ticket' => $ticket,
        ]);

        return $download
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }
}
