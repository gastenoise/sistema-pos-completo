<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Sale;
use App\Models\SalePayment;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class SalePaymentController extends Controller
{
    // GET /protected/sales/{sale}/payments
    public function index(Request $request, $saleId)
    {
        $sale = Sale::where('id', $saleId)
            ->where('business_id', $request->attributes->get('current_business')->id)
            ->firstOrFail();

        $payments = $sale->payments()->get()->map(function($p) {
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

    // POST /protected/sales/{sale}/payments/{payment}/confirm
    public function confirm(Request $request, $saleId, $paymentId)
    {
        $sale = Sale::where('id', $saleId)
            ->where('business_id', $request->attributes->get('current_business')->id)
            ->firstOrFail();

        $payment = SalePayment::where('id', $paymentId)->where('sale_id', $sale->id)->firstOrFail();

        if ($payment->status !== 'pending') {
            return response()->json(['success' => false, 'errors' => ['message' => 'Payment is not pending']], Response::HTTP_CONFLICT);
        }

        // policy: only cashier/admin can confirm
        $this->authorize('confirmPayment', $sale);

        $payment->status = 'confirmed';
        $payment->confirmed_at = now();
        $payment->confirmed_by = auth()->id();
        if ($request->filled('transaction_reference')) {
            $payment->transaction_reference = $request->input('transaction_reference');
        }
        $payment->save();

        return response()->json(['success' => true, 'data' => $payment]);
    }

    // POST /protected/sales/{sale}/payments/{payment}/fail
    public function fail(Request $request, $saleId, $paymentId)
    {
        $sale = Sale::where('id', $saleId)
            ->where('business_id', $request->attributes->get('current_business')->id)
            ->firstOrFail();

        $payment = SalePayment::where('id', $paymentId)->where('sale_id', $sale->id)->firstOrFail();

        // policy check
        $this->authorize('confirmPayment', $sale);

        $payment->status = 'failed';
        $payment->confirmed_at = now();
        $payment->confirmed_by = auth()->id();
        $payment->save();

        return response()->json(['success' => true, 'data' => $payment]);
    }
}
