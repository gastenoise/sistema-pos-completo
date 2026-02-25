<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusinessRolePermission extends Model
{
    protected $fillable = [
        'business_id',
        'role',
        'permission_key',
        'allowed',
    ];

    protected $casts = [
        'allowed' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
