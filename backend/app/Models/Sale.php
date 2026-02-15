<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasBusiness;

class Sale extends Model
{
    use HasBusiness;
    protected $guarded = ['id'];
    
    public function items(): HasMany { return $this->hasMany(SaleItem::class); }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }
    public function payments(): HasMany { return $this->hasMany(SalePayment::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function business(): BelongsTo { return $this->belongsTo(Business::class); }
    public function cashRegisterSession(): BelongsTo { return $this->belongsTo(CashRegisterSession::class); }
    
    public function calculateTotal(): void
    {
        $this->total_amount = $this->items->sum('total');
        $this->save();
    }
}
