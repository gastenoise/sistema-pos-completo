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

    /**
     * @return array{content:string,filename:string}
     */
    public function generate(Sale $sale): array
    {
        $ticket = $this->saleTicketService->build($sale);
        $filename = sprintf('ticket-venta-%d.pdf', $sale->id);

        $pdf = Pdf::loadView('tickets.sale', [
            'ticket' => $ticket,
        ]);

        return [
            'content' => $pdf->output(),
            'filename' => $filename,
        ];
    }

    public function render(Sale $sale, bool $download = false): Response
    {
        $ticketPdf = $this->generate($sale);

        return $download
            ? response($ticketPdf['content'], 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => sprintf('attachment; filename="%s"', $ticketPdf['filename']),
            ])
            : response($ticketPdf['content'], 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => sprintf('inline; filename="%s"', $ticketPdf['filename']),
            ]);
    }
}
