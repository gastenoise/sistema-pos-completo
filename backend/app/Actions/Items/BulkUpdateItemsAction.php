<?php

namespace App\Actions\Items;

use App\Models\Item;
use App\Models\SepaItem;
use App\Models\SepaItemBusinessPrice;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BulkUpdateItemsAction
{
    public function execute(array $validated): array
    {
        $operation = $validated['operation'];

        [$localIds, $sepaIds] = $this->resolveTargets($validated);

        if ($localIds === [] && $sepaIds === []) {
            throw ValidationException::withMessages([
                'targets' => ['At least one local or SEPA item target is required.'],
            ]);
        }

        return DB::transaction(function () use ($localIds, $sepaIds, $operation, $validated) {
            $updatedLocal = 0;
            $updatedSepa = 0;

            if ($localIds !== []) {
                $items = Item::whereIn('id', $localIds)->lockForUpdate()->get();
                if ($items->count() !== count($localIds)) {
                    throw ValidationException::withMessages([
                        'ids' => ['One or more local items were not found for the current business.'],
                    ]);
                }

                if ($operation === 'set_category') {
                    Item::whereIn('id', $localIds)->update(['category_id' => $validated['category_id'] ?? null]);
                    $updatedLocal = count($localIds);
                }

                if ($operation === 'set_price') {
                    Item::whereIn('id', $localIds)->update(['price' => round((float) $validated['price'], 2)]);
                    $updatedLocal = count($localIds);
                }

                if ($operation === 'adjust_price') {
                    $delta = (float) $validated['price_delta'];
                    foreach ($items as $item) {
                        $newPrice = round(((float) $item->price) * (1 + ($delta / 100)), 2);
                        if ($newPrice < 0) {
                            throw ValidationException::withMessages([
                                'price_delta' => ["Adjusted price cannot be negative for item {$item->id}."],
                            ]);
                        }
                        $item->price = $newPrice;
                        $item->save();
                    }
                    $updatedLocal = count($localIds);
                }
            }

            if ($sepaIds !== []) {
                $sepaItems = SepaItem::query()->whereIn('id', $sepaIds)->lockForUpdate()->get();
                if ($sepaItems->count() !== count($sepaIds)) {
                    throw ValidationException::withMessages([
                        'targets' => ['One or more SEPA items were not found.'],
                    ]);
                }

                $businessId = (int) ($validated['business_id'] ?? 0);

                if ($operation === 'set_category') {
                    foreach ($sepaItems as $sepaItem) {
                        SepaItemBusinessPrice::query()->updateOrCreate(
                            ['business_id' => $businessId, 'sepa_item_id' => (int) $sepaItem->id],
                            ['category_id' => $validated['category_id'] ?? null]
                        );
                    }
                    $updatedSepa = count($sepaIds);
                }

                if ($operation === 'set_price') {
                    $targetPrice = round((float) $validated['price'], 2);
                    foreach ($sepaItems as $sepaItem) {
                        SepaItemBusinessPrice::query()->updateOrCreate(
                            ['business_id' => $businessId, 'sepa_item_id' => (int) $sepaItem->id],
                            ['price' => $targetPrice > 0 ? $targetPrice : null]
                        );
                    }
                    $updatedSepa = count($sepaIds);
                }

                if ($operation === 'adjust_price') {
                    $delta = (float) $validated['price_delta'];
                    $overrides = SepaItemBusinessPrice::query()
                        ->where('business_id', $businessId)
                        ->whereIn('sepa_item_id', $sepaIds)
                        ->get()
                        ->keyBy('sepa_item_id');

                    foreach ($sepaItems as $sepaItem) {
                        $override = $overrides->get((int) $sepaItem->id);
                        $basePrice = $override?->price !== null ? (float) $override->price : (float) $sepaItem->price;
                        $newPrice = round($basePrice * (1 + ($delta / 100)), 2);
                        if ($newPrice < 0) {
                            throw ValidationException::withMessages([
                                'price_delta' => ["Adjusted price cannot be negative for SEPA item {$sepaItem->id}."],
                            ]);
                        }

                        SepaItemBusinessPrice::query()->updateOrCreate(
                            ['business_id' => $businessId, 'sepa_item_id' => (int) $sepaItem->id],
                            ['price' => $newPrice]
                        );
                    }
                    $updatedSepa = count($sepaIds);
                }
            }

            return [
                'requested_count' => count($localIds) + count($sepaIds),
                'updated_count' => $updatedLocal + $updatedSepa,
                'updated_local_count' => $updatedLocal,
                'updated_sepa_count' => $updatedSepa,
                'operation' => $operation,
                'local_ids' => $localIds,
                'sepa_ids' => $sepaIds,
            ];
        });
    }

    private function resolveTargets(array $validated): array
    {
        $localIds = [];
        $sepaIds = [];

        if (!empty($validated['targets']) && is_array($validated['targets'])) {
            foreach ($validated['targets'] as $target) {
                $source = $target['source'] ?? 'local';
                $id = isset($target['id']) ? (int) $target['id'] : 0;
                if ($id <= 0) {
                    continue;
                }
                if ($source === 'sepa') {
                    $sepaIds[] = $id;
                } else {
                    $localIds[] = $id;
                }
            }
        }

        if ($localIds === [] && !empty($validated['ids'])) {
            $localIds = array_map('intval', $validated['ids']);
        }

        return [array_values(array_unique($localIds)), array_values(array_unique($sepaIds))];
    }
}
