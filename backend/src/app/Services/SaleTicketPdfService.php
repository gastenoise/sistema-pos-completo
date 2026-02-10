<?php

namespace App\Services;

use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

class SaleTicketPdfService
{
    private const TICKET_WIDTH_MM = 80.0;

    private const TICKET_BASE_HEIGHT_MM = 95.0;

    private const TICKET_LINE_HEIGHT_MM = 6.0;

    private const DOMPDF_RUNTIME_DIRECTORIES = [
        'tmp',
        'font',
        'font-cache',
    ];

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

        $this->ensureRuntimeDirectories();
        $runtimeBasePath = storage_path('app/dompdf');

        $paper = $this->buildTicketPaper($ticket);

        $pdf = Pdf::setOption([
            'tempDir' => $runtimeBasePath.'/tmp',
            'fontDir' => $runtimeBasePath.'/font',
            'fontCache' => $runtimeBasePath.'/font-cache',
            'chroot' => base_path(),
        ])->setPaper($paper)->loadView('tickets.sale', [
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


    /**
     * @param array<string,mixed> $ticket
     *
     * @return array{0:float,1:float,2:float,3:float}
     */
    private function buildTicketPaper(array $ticket): array
    {
        $itemLines = count($ticket['items'] ?? []);
        $paymentLines = count($ticket['payments'] ?? []);
        $estimatedLines = 14 + $itemLines + $paymentLines;

        $heightMm = self::TICKET_BASE_HEIGHT_MM + ($estimatedLines * self::TICKET_LINE_HEIGHT_MM);

        return [
            0.0,
            0.0,
            $this->mmToPoints(self::TICKET_WIDTH_MM),
            $this->mmToPoints($heightMm),
        ];
    }

    private function mmToPoints(float $millimeters): float
    {
        return $millimeters * 2.8346456693;
    }

    private function ensureRuntimeDirectories(): void
    {
        $basePath = storage_path('app/dompdf');

        if (!is_dir($basePath)) {
            mkdir($basePath, 0775, true);
        }

        foreach (self::DOMPDF_RUNTIME_DIRECTORIES as $directory) {
            $absolutePath = $basePath.'/'.$directory;

            if (!is_dir($absolutePath)) {
                mkdir($absolutePath, 0775, true);
            }
        }
    }
}
