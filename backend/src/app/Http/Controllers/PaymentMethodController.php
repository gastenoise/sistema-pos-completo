<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use App\Models\BusinessPaymentMethodHide;
use App\Models\Business;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\BusinessContext;
use Illuminate\Support\Facades\Validator;

class PaymentMethodController extends Controller
{
    /**
     * Ver todos los métodos de pago (globales, no ocultos por negocio)
     */
    public function index()
    {
        $methods = PaymentMethod::all();
        return response()->json($methods);
    }

    /**
     * Ver los métodos de pago activos para el negocio actual (los que NO están ocultos).
     */
    public function activeForBusiness(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $business = Business::find($businessId);

        if (!$business) {
            return response()->json([
                'error' => 'Negocio no encontrado',
                'code' => 'BUSINESS_NOT_FOUND'
            ], 404);
        }

        // Obtener los métodos ocultos para este negocio
        $hiddenIds = BusinessPaymentMethodHide::where('business_id', $businessId)
            ->pluck('payment_method_id');

        $activeMethods = PaymentMethod::whereNotIn('id', $hiddenIds)->get();
        $preferredId = $this->resolvePreferredPaymentMethod($business, $activeMethods);

        $activeMethods = $activeMethods->map(function (PaymentMethod $method) use ($preferredId) {
            return array_merge($method->toArray(), [
                'preferred' => $method->id === $preferredId,
            ]);
        });

        return response()->json($activeMethods);
    }

    /**
     * Alterna el estado de visibilidad de un método de pago para el negocio actual.
     * Ahora: true = prender el método (mostrarlo), false = apagar (ocultarlo).
     *
     * @param Request $request Debe incluir un campo booleano 'active': true para mostrar, false para ocultar.
     * @param int $paymentMethodId
     * @return \Illuminate\Http\JsonResponse
     */
    public function toggleHideForBusiness(Request $request, $paymentMethodId)
    {
        // Validar el parámetro 'active'
        $validated = $request->validate([
            'active' => ['required', 'boolean'],
            'preferred' => ['sometimes', 'boolean'],
        ], [
            'active.required' => 'El campo active es requerido y debe ser booleano.',
            'active.boolean' => 'El campo active es requerido y debe ser booleano.',
        ]);

        $active = (bool) $validated['active'];
        $preferredRequested = array_key_exists('preferred', $validated) ? (bool) $validated['preferred'] : null;

        if ($preferredRequested === true && !$active) {
            return response()->json([
                'error' => 'El método preferido debe estar activo para seleccionarlo.',
                'code' => 'PREFERRED_METHOD_MUST_BE_ACTIVE'
            ], 422);
        }

        $businessId = app(BusinessContext::class)->getBusinessId();

        // Comprobar existencia de PaymentMethod sin lanzar excepción
        $method = PaymentMethod::find($paymentMethodId);
        if (!$method) {
            return response()->json([
                'error' => 'Método de pago no encontrado',
                'code' => 'PAYMENT_METHOD_NOT_FOUND'
            ], 404);
        }

        $business = Business::find($businessId);
        if (!$business) {
            return response()->json([
                'error' => 'Negocio no encontrado',
                'code' => 'BUSINESS_NOT_FOUND'
            ], 404);
        }

        $response = DB::transaction(function () use ($business, $businessId, $method, $active, $preferredRequested) {
            $qb = BusinessPaymentMethodHide::where('business_id', $businessId)
                ->where('payment_method_id', $method->id);

            $already = $qb->first();

            if ($active) {
                // Si quiere encender/prender (mostrar), elimina el registro si existe
                if ($already) {
                    $already->delete();
                }
            } else {
                // Si quiere apagar (ocultar), crea el registro si no existe
                if (!$already) {
                    BusinessPaymentMethodHide::create([
                        'business_id' => $businessId,
                        'payment_method_id' => $method->id,
                        'hidden_by' => Auth::id() ?: null,
                    ]);
                }
            }

            if ($preferredRequested === true) {
                BusinessPaymentMethodHide::where('business_id', $businessId)
                    ->where('payment_method_id', $method->id)
                    ->delete();

                $business->preferred_payment_method_id = $method->id;
                $business->save();
            } elseif (!$active && $business->preferred_payment_method_id === $method->id) {
                $hiddenIds = BusinessPaymentMethodHide::where('business_id', $businessId)
                    ->pluck('payment_method_id');
                $activeMethods = PaymentMethod::whereNotIn('id', $hiddenIds)->get();
                $this->resolvePreferredPaymentMethod($business, $activeMethods);
            }

            return [
                'ok' => true,
                'active' => $active,
                'preferred_payment_method_id' => $business->preferred_payment_method_id,
            ];
        });

        return response()->json($response);
    }

    /**
     * Alterna el estado de visibilidad de varios métodos de pago para el negocio actual.
     * Recibe en el body un JSON con pares: payment_method_id => bool.
     *
     * Ahora: true = prender el método (mostrarlo), false = apagar (ocultarlo).
     *
     * Ejemplo de request body:
     * {
     *   "methods": {
     *       "1": true,    // mostrar método 1
     *       "2": false,   // ocultar método 2
     *       "3": true
     *   }
     * }
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function bulkToggleHideForBusiness(Request $request)
    {
        // Validar la request con reglas y mensajes personalizados
        $validated = $request->validate([
            'methods' => ['required', 'array', 'min:1'],
            'preferred_payment_method_id' => ['nullable', 'integer'],
        ], [
            'methods.required' => 'El campo methods es requerido y debe ser un objeto no vacío.',
            'methods.array' => 'El campo methods es requerido y debe ser un objeto no vacío.',
            'methods.min' => 'El campo methods es requerido y debe ser un objeto no vacío.',
        ]);

        $methodsData = $validated['methods'];
        $preferredPaymentMethodId = $validated['preferred_payment_method_id'] ?? null;

        // Buscar todos los PaymentMethod válidos de una en un sólo query
        $idsToCheck = array_filter(array_keys($methodsData), function($id) {
            return is_numeric($id);
        });

        $validMethods = PaymentMethod::whereIn('id', $idsToCheck)->pluck('id')->all();
        $validMethodsLookup = array_flip($validMethods);

        $results = [];
        $businessId = app(BusinessContext::class)->getBusinessId();
        $business = Business::find($businessId);

        if (!$business) {
            return response()->json([
                'error' => 'Negocio no encontrado',
                'code' => 'BUSINESS_NOT_FOUND'
            ], 404);
        }

        if ($preferredPaymentMethodId !== null && !PaymentMethod::whereKey($preferredPaymentMethodId)->exists()) {
            return response()->json([
                'error' => 'Método de pago preferido no encontrado',
                'code' => 'PAYMENT_METHOD_NOT_FOUND'
            ], 404);
        }

        if ($preferredPaymentMethodId !== null && array_key_exists((string) $preferredPaymentMethodId, $methodsData)) {
            $preferredActiveValue = filter_var(
                $methodsData[(string) $preferredPaymentMethodId],
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE
            );

            if ($preferredActiveValue === false) {
                return response()->json([
                    'error' => 'El método preferido debe estar activo para seleccionarlo.',
                    'code' => 'PREFERRED_METHOD_MUST_BE_ACTIVE'
                ], 422);
            }
        }

        $response = DB::transaction(function () use (
            $methodsData,
            $validMethodsLookup,
            $businessId,
            $business,
            $preferredPaymentMethodId,
            &$results
        ) {
            foreach ($methodsData as $paymentMethodId => $active) {
                // Chequeo: id numérico
                if (!is_numeric($paymentMethodId)) {
                    $results[$paymentMethodId] = [
                        'ok' => false,
                        'active' => null,
                        'error' => 'paymentMethodId debe ser numérico'
                    ];
                    continue;
                }

                // Chequeo: valor booleano
                // Usamos el validador de Laravel para tipo booleano por cada uno:
                $validator = Validator::make(
                    ['active' => $active],
                    ['active' => 'required|boolean'],
                    [
                        'active.required' => 'El valor debe ser booleano',
                        'active.boolean' => 'El valor debe ser booleano',
                    ]
                );

                if ($validator->fails()) {
                    $results[$paymentMethodId] = [
                        'ok' => false,
                        'active' => null,
                        'error' => 'El valor debe ser booleano'
                    ];
                    continue;
                }

                $activeBool = (bool) $active;

                // Revisar si el método es válido usando el resultado de pluck (mucho más eficiente que hacer find() por cada una)
                if (!isset($validMethodsLookup[$paymentMethodId])) {
                    $results[$paymentMethodId] = [
                        'ok' => false,
                        'active' => $activeBool,
                        'error' => 'Método de pago no encontrado',
                        'code' => 'PAYMENT_METHOD_NOT_FOUND'
                    ];
                    continue;
                }

                $qb = BusinessPaymentMethodHide::where('business_id', $businessId)
                    ->where('payment_method_id', $paymentMethodId);

                $already = $qb->first();

                if ($activeBool) {
                    // Quiere prender (mostrar), elimina si existe
                    if ($already) {
                        $already->delete();
                    }
                    $results[$paymentMethodId] = [
                        'ok' => true,
                        'active' => true
                    ];
                } else {
                    // Quiere apagar (ocultar), crea si no existe
                    if (!$already) {
                        BusinessPaymentMethodHide::create([
                            'business_id' => $businessId,
                            'payment_method_id' => $paymentMethodId,
                            'hidden_by' => Auth::id() ?: null,
                        ]);
                    }
                    $results[$paymentMethodId] = [
                        'ok' => true,
                        'active' => false
                    ];
                }
            }

            if ($preferredPaymentMethodId !== null) {
                BusinessPaymentMethodHide::where('business_id', $businessId)
                    ->where('payment_method_id', $preferredPaymentMethodId)
                    ->delete();

                $business->preferred_payment_method_id = $preferredPaymentMethodId;
                $business->save();
            } else {
                $hiddenIds = BusinessPaymentMethodHide::where('business_id', $businessId)
                    ->pluck('payment_method_id');

                if ($business->preferred_payment_method_id !== null
                    && $hiddenIds->contains($business->preferred_payment_method_id)
                ) {
                    $activeMethods = PaymentMethod::whereNotIn('id', $hiddenIds)->get();
                    $this->resolvePreferredPaymentMethod($business, $activeMethods);
                }
            }

            return [
                'results' => $results,
                'preferred_payment_method_id' => $business->preferred_payment_method_id,
            ];
        });

        return response()->json($response);
    }

    private function resolvePreferredPaymentMethod(Business $business, $activeMethods): ?int
    {
        $preferredId = $business->preferred_payment_method_id;

        if ($preferredId && $activeMethods->contains('id', $preferredId)) {
            return $preferredId;
        }

        $newPreferred = $activeMethods->first();

        if ($newPreferred) {
            $business->preferred_payment_method_id = $newPreferred->id;
            $business->save();
            return $newPreferred->id;
        }

        if ($preferredId !== null) {
            $business->preferred_payment_method_id = null;
            $business->save();
        }

        return null;
    }
}
