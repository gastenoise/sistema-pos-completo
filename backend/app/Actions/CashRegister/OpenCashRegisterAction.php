<?php

namespace App\Actions\CashRegister;

use App\Models\CashRegisterSession;

class OpenCashRegisterAction
{
    public function execute(int $userId, float $amount): ?CashRegisterSession
    {
        $existing = CashRegisterSession::where('status', 'open')
            ->where('opened_by', $userId)
            ->exists();

        if ($existing) {
            return null;
        }

        return CashRegisterSession::create([
            'opened_by' => $userId,
            'opened_at' => now(),
            'opening_cash_amount' => $amount,
            'status' => 'open',
        ]);
    }
}
