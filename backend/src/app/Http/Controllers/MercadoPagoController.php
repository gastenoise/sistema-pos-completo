<?php

namespace App\Http\Controllers;

use App\Models\PaymentWebhookEvent;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SalePayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use MercadoPago\MercadoPagoConfig;
use MercadoPago\Client\Preference\PreferenceClient;
use MercadoPago\Client\Payment\PaymentClient;

class MercadoPagoController extends Controller
{
    /**
     * Test MercadoPago configuration.
     */
    public function testConfig()
    {
        if (!app()->environment(['local', 'testing'])) {
            return response()->json([
                'success' => false,
                'message' => 'Endpoint unavailable.',
            ], 404);
        }

        $accessToken = config('mercadopago.access_token');
        MercadoPagoConfig::setAccessToken($accessToken);

        return response()->json([
            'success' => true,
            'message' => 'MercadoPago test executed.',
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
            return response()->json([
                'success' => false,
                'message' => 'Error al crear preferencia de pago.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Webhook de notificaciones de Mercado Pago
     * Esta es la ÚNICA fuente confiable para cerrar una venta en tu sistema.
     */
    public function webhook(Request $request)
    {
        if (!$this->isValidWebhookSignature($request)) {
            Log::warning('mercadopago_webhook_invalid_signature', [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'has_signature_header' => (bool) ($request->header('X-Signature') ?? $request->header('x-signature')),
            ]);

            return response()->json([
                'error' => true,
                'message' => 'Invalid signature',
            ], 401);
        }

        $payload = $request->all();
        $type = $payload['type'] ?? $payload['topic'] ?? null;
        $dataId = $payload['data']['id'] ?? null;

        if ($type !== 'payment') {
            Log::info('mercadopago_webhook_ignored_type', [
                'type' => $type,
            ]);

            return response()->json(['received' => true], 200);
        }

        if (!$dataId) {
            Log::warning('mercadopago_webhook_missing_data_id', [
                'payload_keys' => array_keys($payload),
            ]);

            return response()->json([
                'error' => true,
                'message' => 'Invalid payload',
            ], 403);
        }

        $eventId = (string) ($payload['id'] ?? ('payment:' . $dataId));

        try {
            $alreadyProcessed = !PaymentWebhookEvent::createIfNotExists($eventId, $payload, $type);

            if ($alreadyProcessed) {
                Log::info('mercadopago_webhook_duplicate_event', [
                    'event_id' => $eventId,
                    'type' => $type,
                ]);

                return response()->json(['received' => true, 'duplicate' => true], 200);
            }

            $accessToken = config('mercadopago.access_token');
            MercadoPagoConfig::setAccessToken($accessToken);
            $paymentMethod = PaymentMethod::where('code', 'mercado_pago')->first();

            DB::transaction(function () use ($dataId, $eventId, $paymentMethod) {
                $paymentClient = new PaymentClient();
                $payment = $paymentClient->get($dataId);

                $externalReference = $payment['external_reference'] ?? null;
                $status = $payment['status'] ?? null;
                $statusDetail = $payment['status_detail'] ?? null;

                Log::info('mercadopago_webhook_payment_fetched', [
                    'event_id' => $eventId,
                    'payment_id' => $dataId,
                    'external_reference' => $externalReference,
                    'status' => $status,
                    'status_detail' => $statusDetail,
                ]);

                if (!$externalReference) {
                    return;
                }

                $sale = Sale::lockForUpdate()->find($externalReference);

                if (!$sale) {
                    Log::warning('mercadopago_webhook_sale_not_found', [
                        'event_id' => $eventId,
                        'external_reference' => $externalReference,
                    ]);

                    return;
                }

                $salePayment = SalePayment::query()
                    ->where('sale_id', $sale->id)
                    ->when($paymentMethod, fn ($query) => $query->where('payment_method_id', $paymentMethod->id))
                    ->where('transaction_reference', (string) $dataId)
                    ->first();

                if (!$salePayment && $paymentMethod) {
                    $salePayment = SalePayment::create([
                        'sale_id' => $sale->id,
                        'payment_method_id' => $paymentMethod->id,
                        'amount' => (float) ($payment['transaction_amount'] ?? 0),
                        'transaction_reference' => (string) $dataId,
                        'status' => SalePayment::STATUS_PENDING,
                    ]);
                }

                if ($salePayment) {
                    if ($status === 'approved') {
                        $salePayment->update([
                            'status' => SalePayment::STATUS_CONFIRMED,
                            'confirmed_at' => now(),
                        ]);
                    } elseif (in_array($status, ['rejected', 'cancelled'], true)) {
                        $salePayment->update([
                            'status' => SalePayment::STATUS_FAILED,
                        ]);
                    }
                }

                if ($status === 'approved' && $sale->status === 'open') {
                    $sale->update([
                        'status' => 'closed',
                        'closed_at' => now(),
                    ]);
                }
            });

            return response()->json(['received' => true], 200);
        } catch (\Throwable $e) {
            Log::error('mercadopago_webhook_processing_error', [
                'event_id' => $eventId,
                'payment_id' => $dataId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => true,
                'message' => 'Error procesando notificación',
            ], 500);
        }
    }

    private function isValidWebhookSignature(Request $request): bool
    {
        $webhookSecret = config('mercadopago.webhook_secret');

        if (!$webhookSecret) {
            Log::warning('mercadopago_webhook_secret_not_configured');
            return false;
        }

        $signature = $request->header('X-Signature') ?? $request->header('x-signature');

        if (!$signature) {
            return false;
        }

        $expectedSignature = hash_hmac('sha256', $request->getContent(), $webhookSecret);

        return hash_equals($expectedSignature, trim($signature));
    }

    /**
     * Muestra mensaje tras el regreso desde Mercado Pago (Back URLs)
     * NO actúa sobre la base de datos, solo muestra el estado al cliente.
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

        return response()->json([
            'success' => true,
            'status' => $status,
            'message' => $message,
        ]);
    }
}
