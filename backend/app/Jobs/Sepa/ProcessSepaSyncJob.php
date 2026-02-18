<?php

namespace App\Jobs\Sepa;

use App\Services\Sepa\SepaImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessSepaSyncJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly string $day,
        public readonly ?string $date = null,
    ) {
    }

    public function handle(SepaImportService $importService): void
    {
        $importService->import($this->day, $this->date);
    }
}
