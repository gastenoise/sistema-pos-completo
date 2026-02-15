<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'unit_price_snapshot' => 'decimal:2',
        'total' => 'decimal:2',
        'quantity' => 'integer',
        'category_id_snapshot' => 'integer',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function categorySnapshot(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id_snapshot');
    }
}