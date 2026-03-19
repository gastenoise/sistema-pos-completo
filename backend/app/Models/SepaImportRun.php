<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SepaImportRun extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'error_samples' => 'array',
        'pipeline_state' => 'array',
    ];
}
