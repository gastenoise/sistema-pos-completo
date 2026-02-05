<?php

namespace App\Http\Controllers;

use App\Models\CashRegisterSession;
use App\Models\CashRegisterExpectedTotal;
use App\Models\CashClosure;
use App\Models\PaymentMethod;
use App\Models\SalePayment;
use App\Services\BusinessContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

    public function open(Request $request)
    {
        // Verificar si ya tiene caja abierta
        $existing = CashRegisterSession::where('status', 'open')
            ->where('opened_by', Auth::id())
            ->exists();

        if ($existing) {
            return response()->json(['success' => false, 'message' => 'Cash register already open'], 400);
        }

        $request->validate(['amount' => 'required|numeric|min:0']);

        $session = CashRegisterSession::create([
            'opened_by' => Auth::id(),
            'opened_at' => now(),
            'opening_cash_amount' => $request->amount,
            'status' => 'open'
        ]);

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

        $salesCount = $session->sales()->where('status', '!=', 'voided')->count();
        $totalSales = $session->sales()->where('status', '!=', 'voided')->sum('total_amount');

        return response()->json([
            'success' => true,
            'data' => [
                'total_sales' => (float) $totalSales,
                'sales_count' => $salesCount,
                'payment_totals' => $paymentTotals,
                'breakdown' => $totals,
            ]
        ]);
    }

    public function close(Request $request)
    {
        $request->validate([
            'real_cash' => 'required|numeric|min:0',
            // Opcional: Array de totales reales por otros medios si se requiere conciliación compleja
        ]);

        $user = Auth::user();
        
        // Buscar sesión abierta
        $session = CashRegisterSession::where('status', 'open')
            ->where('opened_by', $user->id)
            ->firstOrFail();

        DB::beginTransaction();
        try {
            // 1. Calcular Esperado en EFECTIVO (Cash)
            // Asumimos que existe un método con code='cash'.
            // En un sistema real buscaríamos el ID dinámicamente.
            $cashMethod = PaymentMethod::where('code', 'cash')->first();
            
            $salesCash = 0;
            if ($cashMethod) {
                $salesCash = SalePayment::whereHas('sale', function($q) use ($session) {
                    $q->where('cash_register_session_id', $session->id)
                      ->where('status', '!=', 'voided');
                })
                ->where('payment_method_id', $cashMethod->id)
                ->sum('amount');
            }

            $expectedCash = $session->opening_cash_amount + $salesCash;
            $difference = $request->real_cash - $expectedCash;

            // 2. Guardar Cierre
            CashClosure::create([
                'business_id' => $session->business_id,
                'cash_register_session_id' => $session->id,
                'expected_cash' => $expectedCash,
                'real_cash' => $request->real_cash,
                'difference' => $difference,
                'created_by' => $user->id
            ]);

            // 3. Guardar Totales Esperados por todos los métodos (snapshot para histórico)
            $allTotals = SalePayment::whereHas('sale', function($q) use ($session) {
                    $q->where('cash_register_session_id', $session->id)
                      ->where('status', '!=', 'voided');
                })
                ->selectRaw('payment_method_id, sum(amount) as total')
                ->groupBy('payment_method_id')
                ->get();

            foreach ($allTotals as $total) {
                CashRegisterExpectedTotal::create([
                    'cash_register_session_id' => $session->id,
                    'payment_method_id' => $total->payment_method_id,
                    'expected_amount' => $total->total
                ]);
            }

            // 4. Cerrar sesión
            $session->update([
                'status' => 'closed',
                'closed_at' => now()
            ]);

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Cash register closed successfully']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
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
                'expectedTotals.paymentMethod'
            ])
            ->orderByDesc('closed_at')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $sessions]);
    }
}
