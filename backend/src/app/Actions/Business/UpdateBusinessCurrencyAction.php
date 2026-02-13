<?php

namespace App\Actions\Business;

use App\Models\Business;

class UpdateBusinessCurrencyAction
{
    public function execute(Business $business, string $currency): Business
    {
        $business->currency = $currency;
        $business->save();

        return $business->fresh();
    }
}
