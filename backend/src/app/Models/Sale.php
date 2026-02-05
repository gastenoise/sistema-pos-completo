<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasBusiness;

class Sale extends Model
{
    use HasBusiness;
    protected $guarded = ['id'];
    
    public function items() { return $this->hasMany(SaleItem::class); }
    public function payments() { return $this->hasMany(SalePayment::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    
    public function calculateTotal(): void
    {
        $this->total_amount = $this->items->sum('total');
        $this->save();
    }
}
