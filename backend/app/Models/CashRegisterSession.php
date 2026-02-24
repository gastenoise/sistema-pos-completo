<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasBusiness;

class CashRegisterSession extends Model
{
    use HasBusiness;

    protected $guarded = ['id'];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'opening_cash_amount' => 'decimal:2',
    ];

    public function opener(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function closures(): HasMany
    {
        return $this->hasMany(CashClosure::class);
    }

    public function expectedTotals(): HasMany
    {
        return $this->hasMany(CashRegisterExpectedTotal::class);
    }

    // Helper para verificar si está abierta
    public function isOpen(): bool
    {
        return $this->status === 'open';
    }
}