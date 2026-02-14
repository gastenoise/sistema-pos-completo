<?php

namespace App\Actions\Items;

use App\Models\Import;
use App\Models\Item;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ImportItemsAction
{
    private function parseNullableDecimal(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return round((float) $value, 2);
    }

    private function parseNullableText(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);

        return $trimmed !== '' ? $trimmed : null;
    }

    public function execute(array $items, bool $syncBySku, int $businessId): array
    {
        return DB::transaction(function () use ($items, $syncBySku, $businessId) {
            $count = 0;
            foreach ($items as $row) {
                $payload = [
                    'name' => $row['name'],
                    'price' => round((float) $row['price'], 2),
                    'presentation_quantity' => $this->parseNullableDecimal($row['presentation_quantity'] ?? null),
                    'presentation_unit' => $this->parseNullableText($row['presentation_unit'] ?? null),
                    'brand' => $this->parseNullableText($row['brand'] ?? null),
                    'list_price' => $this->parseNullableDecimal($row['list_price'] ?? null),
                ];

                if ($syncBySku && !empty($row['sku'])) {
                    Item::updateOrCreate(
                        ['business_id' => $businessId, 'sku' => $row['sku']],
                        $payload + ['active' => true]
                    );
                } else {
                    Item::create($payload + [
                        'business_id' => $businessId,
                        'sku' => $row['sku'] ?? null,
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
