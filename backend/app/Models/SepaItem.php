<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SepaItem extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'price' => 'decimal:2',
        'presentation_quantity' => 'decimal:2',
        'list_price' => 'decimal:2',
    ];

    public function businessPrices(): HasMany
    {
        return $this->hasMany(SepaItemBusinessPrice::class);
    }
}
