<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasBusiness;

class Item extends Model
{
    use HasBusiness;

    protected $guarded = ['id'];

    protected $casts = [
        'price' => 'decimal:2',
        'presentation_quantity' => 'decimal:2',
        'list_price' => 'decimal:2',
    ];
    
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
