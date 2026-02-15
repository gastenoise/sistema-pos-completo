<?php

namespace App\Policies;

use App\Models\Sale;
use App\Models\User;
use App\Services\BusinessContext;

class SalePolicy
{
    public function update(User $user, Sale $sale): bool
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        if (!$businessId || $sale->business_id !== $businessId) {
            return false;
        }

        if ((int) $sale->user_id === (int) $user->id) {
            return true;
        }

        return $user->businesses()
            ->where('business_id', $businessId)
            ->wherePivotIn('role', ['owner', 'admin'])
            ->exists();
    }
}
