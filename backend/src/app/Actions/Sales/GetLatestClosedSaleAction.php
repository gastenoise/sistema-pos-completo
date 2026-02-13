<?php

namespace App\Actions\Sales;

use App\Models\Sale;

class GetLatestClosedSaleAction
{
    public function execute(int $businessId): ?Sale
    {
        return Sale::with(['items.item.category', 'payments.paymentMethod', 'user'])
            ->where('business_id', $businessId)
            ->whereIn('status', ['closed', 'voided'])
            ->orderByRaw('COALESCE(closed_at, created_at) DESC')
            ->orderByDesc('id')
            ->first();
    }
}
