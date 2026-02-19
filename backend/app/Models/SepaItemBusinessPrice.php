<?php

namespace App\Models;

use App\Traits\HasBusiness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SepaItemBusinessPrice extends Model
{
    use HasBusiness;

    protected $guarded = ['id'];

    protected $casts = [
        'price' => 'decimal:2',
        'category_id' => 'integer',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function sepaItem(): BelongsTo
    {
        return $this->belongsTo(SepaItem::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
