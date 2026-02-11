<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusinessParameter extends Model
{
    public const SHOW_CLOSED_SALE_AUTOMATICALLY = 'show_closed_sale_automatically';

    protected $fillable = [
        'business_id',
        'parameter_id',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
