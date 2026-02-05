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
        'color', // índice legacy para paleta
        'color_hex',
        'icon',
    ];

    public function getColorAttribute($value)
    {
        if (!empty($this->attributes['color_hex'])) {
            return $this->attributes['color_hex'];
        }

        $colors = config('data.colors');
        $index = (int) ($value ?? 1);
        if ($index < 1 || $index > count($colors)) {
            $index = 1;
        }
        return $colors[$index - 1];
    }

    /**
     * Relación con los ítems de esta categoría.
     */
    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }
}
