<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Support\Facades\Crypt;

class EncryptCast implements CastsAttributes
{
    /**
     * Transforma el valor al obtenerlo de la base de datos (desencriptar)
     *
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @param  string  $key
     * @param  mixed  $value
     * @param  array  $attributes
     * @return mixed
     */
    public function get($model, string $key, $value, array $attributes)
    {
        if (!$value) {
            return null;
        }
        try {
            return Crypt::decryptString($value);
        } catch (\Exception $e) {
            // Si falla la desencriptación, devolver el valor original (evita errores de datos legacy)
            return $value;
        }
    }

    /**
     * Transforma el valor antes de guardarlo en la base de datos (encriptar)
     *
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @param  string  $key
     * @param  mixed  $value
     * @param  array  $attributes
     * @return mixed
     */
    public function set($model, string $key, $value, array $attributes)
    {
        if (!empty($value)) {
            return Crypt::encryptString($value);
        }

        return $value;
    }
}