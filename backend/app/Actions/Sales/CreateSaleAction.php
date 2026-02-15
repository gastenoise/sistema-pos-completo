<?php

namespace App\Actions\Sales;

use App\Models\CashRegisterSession;
use App\Models\Sale;
use App\Services\BusinessContext;
use Illuminate\Support\Facades\Auth;

class CreateSaleAction
{
    public function execute(?int $cashRegisterSessionId = null): ?Sale
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        $sessionQuery = CashRegisterSession::where('status', 'open')
            ->where('opened_by', Auth::id())
            ->where('business_id', $businessId);

        $session = $cashRegisterSessionId
            ? $sessionQuery->where('id', $cashRegisterSessionId)->first()
            : $sessionQuery->latest()->first();

        if (!$session) {
            return null;
        }

        return Sale::create([
            'cash_register_session_id' => $session->id,
            'user_id' => Auth::id(),
            'status' => 'open',
            'total_amount' => 0,
        ]);
    }
}
