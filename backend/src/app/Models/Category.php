<?php

namespace App\Models;

use App\Casts\IconNameCast;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasBusiness;

class Category extends Model
{
    use HasBusiness;

    protected $fillable = [
        'business_id',
        'name',
        'color',
        'icon',
    ];

    protected $casts = [
        'icon' => IconNameCast::class,
    ];

    /**
     * Relación con los ítems de esta categoría.
     */
    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }
}
