<?php

namespace App\Services;

use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

class SaleTicketPdfService
{
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

        $pdf = Pdf::setOption([
            'tempDir' => $runtimeBasePath.'/tmp',
            'fontDir' => $runtimeBasePath.'/font',
            'fontCache' => $runtimeBasePath.'/font-cache',
            'chroot' => base_path(),
        ])->loadView('tickets.sale', [
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
