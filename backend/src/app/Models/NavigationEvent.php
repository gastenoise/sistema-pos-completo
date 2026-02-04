<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasBusiness;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NavigationEvent extends Model
{
    use HasBusiness;

    protected $fillable = [
        'business_id',
        'user_id',
        'path',
        'screen',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
