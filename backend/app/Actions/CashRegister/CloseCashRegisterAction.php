<?php

namespace App\Actions\CashRegister;

use App\Models\CashClosure;
use App\Models\CashRegisterExpectedTotal;
use App\Models\CashRegisterSession;
use App\Models\PaymentMethod;
use Illuminate\Support\Facades\DB;

class CloseCashRegisterAction
{
    public function execute(CashRegisterSession $session, int $userId, float $realCash): void
    {
        DB::transaction(function () use ($session, $userId, $realCash) {
            $cashMethod = PaymentMethod::where('code', 'cash')->first();

            $closedSalePayments = $session->closedSalePayments();

            $salesCash = 0;
            if ($cashMethod) {
                $salesCash = $closedSalePayments
                    ->where('payment_method_id', $cashMethod->id)
                    ->sum('amount');
            }

            $expectedCash = $session->opening_cash_amount + $salesCash;
            $difference = $realCash - $expectedCash;

            CashClosure::create([
                'business_id' => $session->business_id,
                'cash_register_session_id' => $session->id,
                'expected_cash' => $expectedCash,
                'real_cash' => $realCash,
                'difference' => $difference,
                'created_by' => $userId,
            ]);

            $allTotals = $session->closedSalePayments()
                ->selectRaw('payment_method_id, sum(amount) as total')
                ->groupBy('payment_method_id')
                ->get();

            foreach ($allTotals as $total) {
                CashRegisterExpectedTotal::create([
                    'cash_register_session_id' => $session->id,
                    'payment_method_id' => $total->payment_method_id,
                    'expected_amount' => $total->total,
                ]);
            }

            $session->update([
                'status' => 'closed',
                'closed_at' => now(),
            ]);
        });
    }
}
