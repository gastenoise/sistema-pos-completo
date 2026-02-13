<?php

namespace App\Actions\Items;

use App\Models\Import;
use App\Models\Item;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ImportItemsAction
{
    public function execute(array $items, bool $syncBySku, int $businessId): array
    {
        return DB::transaction(function () use ($items, $syncBySku, $businessId) {
            $count = 0;
            foreach ($items as $row) {
                if ($syncBySku && !empty($row['sku'])) {
                    Item::updateOrCreate(
                        ['business_id' => $businessId, 'sku' => $row['sku']],
                        [
                            'name' => $row['name'],
                            'price' => $row['price'],
                            'type' => $row['type'] ?? 'product',
                            'active' => true,
                        ]
                    );
                } else {
                    Item::create([
                        'business_id' => $businessId,
                        'name' => $row['name'],
                        'price' => $row['price'],
                        'sku' => $row['sku'] ?? null,
                        'type' => $row['type'] ?? 'product',
                    ]);
                }
                $count++;
            }

            Import::create([
                'business_id' => $businessId,
                'user_id' => Auth::id(),
                'source' => 'csv',
                'status' => 'imported',
                'summary' => ['imported_count' => $count],
            ]);

            return ['imported_count' => $count];
        });
    }
}
