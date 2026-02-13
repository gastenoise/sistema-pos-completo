<?php

namespace App\Actions\Items;

use App\Models\Item;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BulkUpdateItemsAction
{
    public function execute(array $validated): array
    {
        $operation = $validated['operation'];
        $ids = array_values(array_unique($validated['ids']));

        return DB::transaction(function () use ($ids, $operation, $validated) {
            $items = Item::whereIn('id', $ids)->lockForUpdate()->get();

            if ($items->count() !== count($ids)) {
                throw ValidationException::withMessages([
                    'ids' => ['One or more items were not found for the current business.'],
                ]);
            }

            if ($operation === 'set_category') {
                Item::whereIn('id', $ids)->update([
                    'category_id' => $validated['category_id'] ?? null,
                ]);
            }

            if ($operation === 'set_price') {
                Item::whereIn('id', $ids)->update([
                    'price' => round((float) $validated['price'], 2),
                ]);
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
            }

            if ($operation === 'set_active') {
                Item::whereIn('id', $ids)->update([
                    'active' => (bool) $validated['active'],
                ]);
            }

            return [
                'requested_count' => count($ids),
                'updated_count' => count($ids),
                'operation' => $operation,
                'ids' => $ids,
            ];
        });
    }
}
