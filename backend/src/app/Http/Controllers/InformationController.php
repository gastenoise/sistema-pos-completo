<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PaymentMethod;

class InformationController extends Controller
{
    /**
     * Endpoint legacy: ya no hay paleta predefinida en backend.
     */
    public function colors()
    {
        return response()->json([
            'success' => true,
            'data' => []
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

    public function icons()
    {
        return response()->json([
            'success' => true,
            'data' => config('data.icons', []),
        ]);
    }
}
