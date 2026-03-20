<?php

namespace App\Models;

use App\Services\Sepa\SepaImportService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SepaImportRun extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'error_samples' => 'array',
        'pipeline_state' => 'array',
        'file_metrics' => 'array',
        'stage_timestamps' => 'array',
    ];

    public function files(): HasMany
    {
        return $this->hasMany(SepaImportRunFile::class, 'sepa_import_run_id')->orderBy('file_index');
    }

    public function canAdvance(): bool
    {
        return $this->status === 'running' && in_array($this->stage, [
            SepaImportService::STAGE_PENDING_DOWNLOAD,
            SepaImportService::STAGE_DOWNLOADED,
            SepaImportService::STAGE_READY_TO_PROCESS,
            SepaImportService::STAGE_PROCESSING,
            SepaImportService::STAGE_FINALIZING,
        ], true);
    }

    public function canFinalize(): bool
    {
        return $this->status === 'running' && $this->stage === SepaImportService::STAGE_FINALIZING;
    }

    public function hasPendingFiles(): bool
    {
        return $this->files()->whereIn('status', ['pending', 'processing'])->exists();
    }

    public function nextPendingFile(): ?SepaImportRunFile
    {
        return $this->files()
            ->whereIn('status', ['pending', 'processing'])
            ->orderBy('file_index')
            ->first();
    }
}
