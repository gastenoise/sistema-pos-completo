<?php

namespace App\Jobs\Sepa;

use App\Models\SepaImportRun;
use App\Services\Sepa\SepaImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class PrepareSepaImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly int $runId)
    {
    }

    public function handle(SepaImportService $importService): void
    {
        $run = SepaImportRun::query()->find($this->runId);
        if ($run === null) {
            return;
        }

        if ($run->stage === SepaImportService::STAGE_PENDING_DOWNLOAD) {
            $importService->downloadArtifacts($run);

            return;
        }

        if ($run->stage === SepaImportService::STAGE_PENDING_DISCOVERY) {
            $importService->discoverInnerArchives($run);
        }
    }
}
