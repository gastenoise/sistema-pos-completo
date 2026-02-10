<?php

namespace App\Http\Controllers;

use App\Support\ApiErrorResponder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use MercadoPago\MercadoPagoConfig;
use MercadoPago\Client\Preference\PreferenceClient;
use MercadoPago\Client\Payment\PaymentClient;

class MercadoPagoController extends Controller
{
    use ApiErrorResponder;

    /**
     * Test MercadoPago configuration.
     */
    public function testConfig()
    {
        // Set access token from config/mercadopago.php
        $accessToken = config('mercadopago.access_token');
        MercadoPagoConfig::setAccessToken($accessToken);

        // Return access token for testing purposes
        return response()->json([
            'success' => true,
            'message' => 'MercadoPago SDK configured successfully.',
            'access_token' => $accessToken ? '****' . substr($accessToken, -6) : null,
        ]);
    }

    /**
     * Crear y configurar una preferencia de pago.
     *
     * Recibe vía POST los datos de la preferencia (items y opciones adicionales permitidas por MercadoPago)
     * y retorna la preferencia creada (incluyendo el preference_id).
     *
     * Es fundamental que envíes el campo "external_reference" en la data con el ID de tu venta para
     * poder relacionar luego el webhook con el pedido en tu base de datos.
     */
    public function crearPreferencia(Request $request)
    {
        // Establecer el Access Token
        $accessToken = config('mercadopago.access_token');
        MercadoPagoConfig::setAccessToken($accessToken);

        // Validar datos mínimos necesarios (items)
        $data = $request->all();

        if (
            !isset($data['items']) 
            || !is_array($data['items'])
            || count($data['items']) < 1
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Debes enviar al menos un item válido en el request.',
            ], 422);
        }

        // Sugerencia: fuerza el envío de external_reference si existe un pedido en tu sistema
        // por motivos de trazabilidad para el webhook
        if (!isset($data['external_reference'])) {
            // Si tu sistema usa un ID propio de venta, es obligatorio agregarlo aquí.
            // Para la demo lo dejamos pasar, pero lo ideal es requerirlo.
        }

        try {
            $client = new PreferenceClient();
            $preference = $client->create($data);

            return response()->json([
                'success' => true,
                'message' => 'Preferencia de pago creada exitosamente.',
                'preference' => $preference,
                'preference_id' => $preference['id'] ?? null,
            ]);
        } catch (\Throwable $e) {
            return $this->respondWithError(
                request: $request,
                clientMessage: 'Error interno, intente nuevamente.',
                status: 500,
                exception: $e,
                context: ['scope' => 'mercadopago.preference.create']
            );
        }
    }

    /**
     * Webhook de notificaciones de Mercado Pago
     * Esta es la ÚNICA fuente confiable para cerrar una venta en tu sistema.
     * 
     * Mercado Pago enviará POST a esta URL con datos sobre el pago realizado.
     * Haz la validación con X-Signature (si tienes el secret, puedes implementarla aquí).
     * Usando data.id (el ID del pago o topic), consulta la API de Mercado Pago para obtener detalles reales.
     * Usa external_reference para buscar tu venta/pedido en tu base de datos y actualizar el estado.
     */
    public function webhook(Request $request)
    {
        $accessToken = config('mercadopago.access_token');
        MercadoPagoConfig::setAccessToken($accessToken);

        // 1. Validar X-Signature (muy recomendable en producción)
        $signature = $request->header('X-Signature') ?? $request->header('x-signature');
        // TODO: Implementa la validación de signature si usas el secret de Mercado Pago. 
        // (No implementado aquí por simplicidad, solo log de ejemplo)
        if ($signature) {
            Log::info("Webhook MercadoPago: Recepción de X-Signature: $signature");
        }

        // 2. Extraer datos de la notificación
        $payload = $request->all();

        // La notificación puede tener diferentes estructuras; nos interesa el pago
        $type = $payload['type'] ?? $payload['topic'] ?? null;
        $data_id = $payload['data']['id'] ?? null;

        if (!$type || !$data_id) {
            Log::warning('Webhook MercadoPago: Notificación no reconocida', $payload);
            return response()->json(['received' => true], 200);
        }

        // 3. Solo procesar payments (por seguridad y claridad)
        if ($type !== 'payment') {
            Log::info('Webhook MercadoPago: Se recibió notificación de tipo no procesado', ['type' => $type]);
            return response()->json(['received' => true], 200);
        }

        try {
            // Consultar detalles del pago usando SDK
            $paymentClient = new PaymentClient();
            $payment = $paymentClient->get($data_id);

            // 4. Obtener el external_reference (debe usarse para identificar la venta en tu sistema)
            $externalReference = $payment['external_reference'] ?? null;
            $status = $payment['status'] ?? null;
            $statusDetail = $payment['status_detail'] ?? null;

            Log::info('Webhook MercadoPago: Detalle del pago obtenido', [
                'payment_id'         => $data_id,
                'external_reference' => $externalReference,
                'status'             => $status,
                'status_detail'      => $statusDetail,
            ]);

            // 5. Actualiza aquí el estado de tu venta/pedido en la base de datos usando $externalReference
            // (EJEMPLO SIMPLIFICADO: Debes implementar tu lógica de negocio, consulta el modelo Venta/Pedido)
            // Pseudocódigo:
            /*
            $pedido = Pedido::where('id', $externalReference)->first();
            if ($pedido) {
                switch($status) {
                    case 'approved':
                        $pedido->estado = 'aprobado';
                        // Realiza acciones necesarias (descontar stock, enviar email, etc)
                        break;
                    case 'pending':
                        $pedido->estado = 'pendiente';
                        break;
                    case 'rejected':
                        $pedido->estado = 'rechazado';
                        break;
                    // otros estados posibles...
                }
                $pedido->save();
            } else {
                Log::warning('Webhook MercadoPago: No se encontró el pedido con external_reference', ['external_reference' => $externalReference]);
            }
            */

            // Responde rápido para no provocar retry
            return response()->json(['received' => true], 200);

        } catch (\Throwable $e) {
            return $this->respondWithError(
                request: $request,
                clientMessage: 'Error interno, intente nuevamente.',
                status: 500,
                exception: $e,
                context: [
                    'scope' => 'mercadopago.webhook',
                    'data_id' => $data_id ?? null,
                ]
            );
        }
    }

    /**
     * Muestra mensaje tras el regreso desde Mercado Pago (Back URLs)
     * NO actúa sobre la base de datos, solo muestra el estado al cliente.
     * 
     * Se recomienda que tu frontend/SPA consuma este endpoint y muestre el mensaje dinámicamente
     * según el resultado (éxito, pendiente, fallido).
     */
    public function backUrlMessage(Request $request)
    {
        $status = $request->query('status');
        $messages = [
            'approved' => '¡Pago exitoso! Procesaremos tu pedido en breve.',
            'pending'  => 'Estamos confirmando tu pago. Te notificaremos por email cuando esté acreditado.',
            'failure'  => 'No pudimos procesar tu pago. Inténtalo nuevamente o prueba otro método.',
        ];
        $message = $messages[$status] ?? 'Estamos confirmando tu pago. La actualización llegará en breve.';

        // Aquí podrías renderizar una vista Blade, retornar JSON para un SPA, etc.
        // Para este ejemplo retornamos JSON.
        return response()->json([
            'success' => true,
            'status' => $status,
            'message' => $message,
        ]);
    }
}
