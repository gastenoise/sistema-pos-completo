<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SepaImportRunFile extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'metrics' => 'array',
        'csv_headers' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function run(): BelongsTo
    {
        return $this->belongsTo(SepaImportRun::class, 'sepa_import_run_id');
    }
}
