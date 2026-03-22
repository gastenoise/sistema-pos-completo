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
        if ($run === null || in_array($run->stage, [SepaImportService::STAGE_SUCCESS, SepaImportService::STAGE_FAILED], true)) {
            return;
        }

        $importService->advanceRun($run);
    }
}
