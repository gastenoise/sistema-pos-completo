<?php

namespace App\Actions\Items;

use App\Models\SepaItemBusinessPrice;

class UpsertSepaItemBusinessPriceAction
{
    public function execute(int $businessId, int $sepaItemId, float $price): SepaItemBusinessPrice
    {
        return SepaItemBusinessPrice::query()->updateOrCreate(
            [
                'business_id' => $businessId,
                'sepa_item_id' => $sepaItemId,
            ],
            [
                'price' => round($price, 2),
            ]
        );
    }
}
