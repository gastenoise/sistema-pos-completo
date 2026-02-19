<?php

namespace App\Actions\Items;

use App\Models\SepaItemBusinessPrice;

class UpsertSepaItemBusinessPriceAction
{
    public function execute(int $businessId, int $sepaItemId, ?float $price, ?int $categoryId = null): ?SepaItemBusinessPrice
    {
        $hasPrice = $price !== null;
        $hasCategory = $categoryId !== null;

        if (!$hasPrice && !$hasCategory) {
            SepaItemBusinessPrice::query()
                ->where('business_id', $businessId)
                ->where('sepa_item_id', $sepaItemId)
                ->delete();

            return null;
        }

        return SepaItemBusinessPrice::query()->updateOrCreate(
            [
                'business_id' => $businessId,
                'sepa_item_id' => $sepaItemId,
            ],
            [
                'price' => $hasPrice ? round((float) $price, 2) : null,
                'category_id' => $categoryId,
            ]
        );
    }
}
