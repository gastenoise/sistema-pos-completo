<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasBusiness;
use App\Traits\HasColor;

class Category extends Model
{
    use HasBusiness, HasColor;

    protected $fillable = [
        'business_id',
        'name',
        'color', // Agregada para contemplar la columna color
    ];

    /**
     * Relación con los ítems de esta categoría.
     */
    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }
}