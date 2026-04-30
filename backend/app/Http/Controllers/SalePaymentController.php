<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Sale;
use App\Models\SalePayment;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use App\Services\BusinessContext;
use Illuminate\Support\Facades\Auth;

class SalePaymentController extends Controller
{
    // GET /protected/sales/{sale}/payments
    public function index(Request $request, $saleId)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        $sale = Sale::where('id', $saleId)
            ->where('business_id', $businessId)
            ->firstOrFail();

        $payments = $sale->payments()->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'payment_method_id' => $p->payment_method_id,
                'amount' => $p->amount,
                'status' => $p->status,
                'transaction_reference' => $p->transaction_reference,
                'confirmed_at' => $p->confirmed_at,
            ];
        });

        return response()->json(['success' => true, 'data' => $payments]);
    }

    // POST /protected/sales/{sale}/payments/bulk
    public function bulkStore(Request $request, $saleId)
    {
        $validated = $request->validate([
            'payments' => 'required|array|min:1',
            'payments.*.payment_method_id' => 'required|integer|exists:payment_methods,id',
            'payments.*.amount' => 'required|numeric|min:0.01',
            'payments.*.transaction_reference' => 'nullable|string|max:255',
        ]);

        if (!config('mercadopago.enabled', false)) {
            $paymentMethodIds = collect($validated['payments'])->pluck('payment_method_id')->unique();
            $mpMethods = \App\Models\PaymentMethod::whereIn('id', $paymentMethodIds)
                ->where('code', 'mercado_pago')
                ->exists();

            if ($mpMethods) {
                return response()->json([
                    'success' => false,
                    'message' => 'Mercado Pago is currently disabled',
                ], 422);
            }
        }

        $businessId = app(BusinessContext::class)->getBusinessId();

        $sale = Sale::where('id', $saleId)
            ->where('business_id', $businessId)
            ->firstOrFail();

        if ($sale->status !== 'open') {
            return response()->json(['success' => false, 'message' => 'Cannot add payments to a closed sale'], 400);
        }

        if ($sale->payments()->exists()) {
            return response()->json(['success' => false, 'message' => 'Payments already initialized for this sale'], 409);
        }

        $totalRequested = collect($validated['payments'])->sum(fn ($payment) => (float) $payment['amount']);
        if (abs($totalRequested - (float) $sale->total_amount) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Payment division must match sale total',
                'sale_total' => (float) $sale->total_amount,
                'payment_total' => $totalRequested,
            ], 422);
        }

        $created = DB::transaction(function () use ($sale, $validated) {
            $payments = [];
            foreach ($validated['payments'] as $payload) {
                $payments[] = $sale->payments()->create([
                    'payment_method_id' => $payload['payment_method_id'],
                    'amount' => $payload['amount'],
                    'status' => SalePayment::STATUS_PENDING,
                    'transaction_reference' => $payload['transaction_reference'] ?? null,
                ]);
            }

            return collect($payments)->map(fn ($payment) => $payment->fresh()->load('paymentMethod'));
        });

        return response()->json(['success' => true, 'data' => $created]);
    }

    // POST /protected/sales/{sale}/payments/{payment}/confirm
    public function confirm(Request $request, $saleId, $paymentId)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        $sale = Sale::where('id', $saleId)
            ->where('business_id', $businessId)
            ->firstOrFail();

        $payment = SalePayment::where('id', $paymentId)->where('sale_id', $sale->id)->firstOrFail();

        if ($payment->status !== 'pending') {
            return response()->json(['success' => false, 'errors' => ['message' => 'Payment is not pending']], Response::HTTP_CONFLICT);
        }

        if (!$this->canConfirmPayment($businessId)) {
            return response()->json(['message' => 'Not authorized to confirm payments'], Response::HTTP_FORBIDDEN);
        }

        $payment->status = 'confirmed';
        $payment->confirmed_at = now();
        $payment->confirmed_by = auth()->id();
        if ($request->filled('transaction_reference')) {
            $payment->transaction_reference = $request->input('transaction_reference');
        }
        $payment->save();

        return response()->json(['success' => true, 'data' => $payment->fresh()->load('paymentMethod')]);
    }

    // POST /protected/sales/{sale}/payments/{payment}/fail
    public function fail(Request $request, $saleId, $paymentId)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        $sale = Sale::where('id', $saleId)
            ->where('business_id', $businessId)
            ->firstOrFail();

        $payment = SalePayment::where('id', $paymentId)->where('sale_id', $sale->id)->firstOrFail();

        if (!$this->canConfirmPayment($businessId)) {
            return response()->json(['message' => 'Not authorized to confirm payments'], Response::HTTP_FORBIDDEN);
        }

        $payment->status = 'failed';
        $payment->confirmed_at = now();
        $payment->confirmed_by = auth()->id();
        $payment->save();

        return response()->json(['success' => true, 'data' => $payment]);
    }

    private function canConfirmPayment(?int $businessId): bool
    {
        if (!$businessId) {
            return false;
        }
        $user = Auth::user();
        if (!$user) {
            return false;
        }

        return $user->hasRole('owner', $businessId)
            || $user->hasRole('admin', $businessId)
            || $user->hasRole('cashier', $businessId);
    }
}
