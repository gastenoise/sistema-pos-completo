<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PaymentMethod;

class InformationController extends Controller
{
    /**
     * Retorna la paleta de colores del sistema.
     */
    public function colors()
    {
        $colors = config('data.colors', []);
        $result = [];
        foreach ($colors as $index => $color) {
            $result[$index + 1] = $color; // Clave arranca desde 1
        }
        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * Retorna la lista de métodos de pago disponibles (sin filtrar por negocio).
     */
    public function paymentMethods()
    {
        $methods = PaymentMethod::all()->pluck('name', 'id');
        return response()->json([
            'success' => true,
            'data' => $methods
        ]);
    }
}