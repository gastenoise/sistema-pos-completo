<?php

namespace App\Http\Controllers;

use App\Actions\CashRegister\CloseCashRegisterAction;
use App\Actions\CashRegister\OpenCashRegisterAction;
use App\Models\CashRegisterSession;
use App\Models\PaymentMethod;
use App\Models\SalePayment;
use App\Services\BusinessContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CashRegisterController extends Controller
{
    public function status()
    {
        $session = CashRegisterSession::where('status', 'open')
            ->where('opened_by', Auth::id())
            ->latest()
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'is_open' => (bool) $session,
                'session' => $session
            ]
        ]);
    }

    public function open(Request $request, OpenCashRegisterAction $openCashRegisterAction)
    {
        $validated = $request->validate(['amount' => 'required|numeric|min:0']);

        $session = $openCashRegisterAction->execute(Auth::id(), (float) $validated['amount']);

        if (!$session) {
            return response()->json(['success' => false, 'message' => 'Cash register already open'], 400);
        }

        return response()->json(['success' => true, 'data' => $session]);
    }

    public function getExpectedTotals($sessionId)
    {
        $session = CashRegisterSession::findOrFail($sessionId);
        
        // Sumar pagos agrupados por metodo para esta sesión
        // Unimos SalePayments -> Sales -> Session
        $totals = SalePayment::whereHas('sale', function($q) use ($sessionId) {
                $q->where('cash_register_session_id', $sessionId)
                  ->where('status', '!=', 'voided'); // Ignorar anuladas
            })
            ->selectRaw('payment_method_id, sum(amount) as total')
            ->groupBy('payment_method_id')
            ->with('paymentMethod')
            ->get();

        $paymentTotals = $totals->mapWithKeys(function ($total) {
            return [
                $total->paymentMethod?->code ?? $total->payment_method_id => (float) $total->total
            ];
        });

        $cashMethod = PaymentMethod::where('code', 'cash')->first();
        $cashTotal = 0.0;
        if ($cashMethod) {
            $cashTotal = (float) ($totals->firstWhere('payment_method_id', $cashMethod->id)?->total ?? 0);
        }

        $salesCount = $session->sales()->where('status', '!=', 'voided')->count();
        $totalSales = $session->sales()->where('status', '!=', 'voided')->sum('total_amount');

        return response()->json([
            'success' => true,
            'data' => [
                'total_sales' => (float) $totalSales,
                'sales_count' => $salesCount,
                'payment_totals' => $paymentTotals,
                'cash_sales' => $cashTotal,
                'expected_cash' => (float) ($session->opening_cash_amount + $cashTotal),
                'breakdown' => $totals,
            ]
        ]);
    }

    public function close(Request $request, CloseCashRegisterAction $closeCashRegisterAction)
    {
        $validated = $request->validate([
            'real_cash' => 'required|numeric|min:0',
        ]);

        $user = Auth::user();
        $session = CashRegisterSession::where('status', 'open')
            ->where('opened_by', $user->id)
            ->firstOrFail();

        try {
            $closeCashRegisterAction->execute($session, $user->id, (float) $validated['real_cash']);
            return response()->json(['success' => true, 'message' => 'Cash register closed successfully']);
        } catch (\Throwable $exception) {
            return response()->json(['error' => $exception->getMessage()], 500);
        }
    }

    public function closedSessions(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        $sessions = CashRegisterSession::where('status', 'closed')
            ->where('business_id', $businessId)
            ->with([
                'opener',
                'closures.creator',
                'expectedTotals.paymentMethod',
                'sales'
            ])
            ->orderByDesc('closed_at')
            ->paginate(20);

        $sessions->getCollection()->transform(function (CashRegisterSession $session) {
            $session->total_sales = (float) $session->sales()
                ->where('status', '!=', 'voided')
                ->sum('total_amount');

            $latestClosure = $session->closures->sortByDesc('created_at')->first();
            $session->real_cash = (float) ($latestClosure?->real_cash ?? 0);
            $session->cash_difference = (float) ($latestClosure?->difference ?? 0);

            return $session;
        });

        return response()->json(['success' => true, 'data' => $sessions]);
    }
}
