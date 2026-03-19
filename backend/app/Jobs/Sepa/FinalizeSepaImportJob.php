<?php

namespace App\Jobs\Sepa;

use App\Models\SepaImportRun;
use App\Services\Sepa\SepaImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class FinalizeSepaImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly int $runId)
    {
    }

    public function handle(SepaImportService $importService): void
    {
        $run = SepaImportRun::query()->find($this->runId);
        if ($run === null || $run->stage !== SepaImportService::STAGE_FINALIZING) {
            return;
        }

        $importService->finalizeRun($run);
    }
}
