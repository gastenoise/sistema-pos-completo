<?php

namespace App\Traits;

trait HasColor
{
    /**
     * Accesor para que $this->color retorne el color HEX preestablecido.
     * Si tu modelo ya tiene un getColorAttribute, se sobreescribe con este accesor.
     *
     * @return string
     */
    public function getColorAttribute($value)
    {
        // Usar la paleta definida en config/data/colors.php
        $colors = config('data.colors');

        $index = (int) ($value ?? 1);
        if ($index < 1 || $index > count($colors)) {
            $index = 1;
        }
        return $colors[$index - 1];
    }
}
