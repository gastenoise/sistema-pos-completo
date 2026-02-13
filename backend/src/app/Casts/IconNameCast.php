<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;

class IconNameCast implements CastsAttributes
{
    public function get($model, string $key, $value, array $attributes): ?string
    {
        if ($value === null) {
            return null;
        }

        $id = (int) $value;
        $icons = config('data.icons', []);

        return $icons[$id] ?? ($icons[1] ?? 'Package');
    }

    public function set($model, string $key, $value, array $attributes): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        $icons = config('data.icons', []);

        if (is_numeric($value)) {
            $id = (int) $value;
            return array_key_exists($id, $icons) ? $id : 1;
        }

        if (is_string($value)) {
            $iconName = trim($value);
            $foundId = array_search($iconName, $icons, true);
            return $foundId !== false ? (int) $foundId : 1;
        }

        return 1;
    }
}
