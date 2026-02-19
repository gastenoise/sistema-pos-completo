<?php

namespace App\Actions\Items;

use App\Models\Import;
use App\Models\Item;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ImportItemsAction
{
    private function findExistingItemForSync(int $businessId, ?string $barcode, bool $syncBySku, ?string $sku, bool $syncByBarcode): ?Item
    {
        if ($syncByBarcode && $barcode !== null) {
            return Item::query()
                ->where('business_id', $businessId)
                ->where('barcode', $barcode)
                ->first();
        }

        if (!$syncByBarcode && $syncBySku && $sku !== null) {
            return Item::query()
                ->where('business_id', $businessId)
                ->where('sku', $sku)
                ->first();
        }

        return null;
    }

    public function estimateMetrics(array $items, int $businessId, bool $syncByBarcode = true, bool $syncBySku = false): array
    {
        $toCreate = 0;
        $toUpdate = 0;

        foreach ($items as $row) {
            $barcode = $this->parseNullableText($row['barcode'] ?? null);
            $sku = $this->parseNullableText($row['sku'] ?? null);

            $existing = $this->findExistingItemForSync($businessId, $barcode, $syncBySku, $sku, $syncByBarcode);

            if ($existing) {
                $toUpdate++;
            } else {
                $toCreate++;
            }
        }

        return [
            'to_create' => $toCreate,
            'to_update' => $toUpdate,
        ];
    }

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

    private function parseNullableInteger(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_numeric($value)) {
            return null;
        }

        return (int) $value;
    }

    public function execute(array $items, bool $syncBySku, int $businessId, bool $syncByBarcode = true, ?int $globalCategoryId = null): array
    {
        return DB::transaction(function () use ($items, $syncBySku, $businessId, $syncByBarcode, $globalCategoryId) {
            $count = 0;
            $createdCount = 0;
            $updatedCount = 0;
            foreach ($items as $row) {
                $barcode = $this->parseNullableText($row['barcode'] ?? null);
                $sku = $this->parseNullableText($row['sku'] ?? null);

                $rowCategoryId = $this->parseNullableInteger($row['category_id'] ?? null);

                $parsedPrice = $this->parseNullableDecimal($row['price'] ?? null);
                $parsedListPrice = $this->parseNullableDecimal($row['list_price'] ?? null);
                $resolvedPrice = $parsedPrice ?? $parsedListPrice;
                $resolvedListPrice = $parsedListPrice ?? $parsedPrice;

                if ($resolvedPrice === null) {
                    continue;
                }

                $payload = [
                    'name' => $row['name'],
                    'price' => $resolvedPrice,
                    'sku' => $sku,
                    'barcode' => $barcode,
                    'category_id' => $rowCategoryId ?? $globalCategoryId,
                    'presentation_quantity' => $this->parseNullableDecimal($row['presentation_quantity'] ?? null),
                    'presentation_unit' => $this->parseNullableText($row['presentation_unit'] ?? null),
                    'brand' => $this->parseNullableText($row['brand'] ?? null),
                    'list_price' => $resolvedListPrice,
                ];

                if ($syncByBarcode && $barcode !== null) {
                    $item = Item::query()->firstOrNew([
                        'business_id' => $businessId,
                        'barcode' => $barcode,
                    ]);
                    $item->fill($payload);
                    $item->save();

                    if ($item->wasRecentlyCreated) {
                        $createdCount++;
                    } else {
                        $updatedCount++;
                    }
                } elseif (!$syncByBarcode && $syncBySku && $sku !== null) {
                    $item = Item::query()->firstOrNew([
                        'business_id' => $businessId,
                        'sku' => $sku,
                    ]);
                    $item->fill($payload);
                    $item->save();

                    if ($item->wasRecentlyCreated) {
                        $createdCount++;
                    } else {
                        $updatedCount++;
                    }
                } else {
                    Item::create($payload + [
                        'business_id' => $businessId,
                    ]);
                    $createdCount++;
                }
                $count++;
            }

            Import::create([
                'business_id' => $businessId,
                'user_id' => Auth::id(),
                'source' => 'csv',
                'status' => 'imported',
                'summary' => [
                    'imported_count' => $count,
                    'created_count' => $createdCount,
                    'updated_count' => $updatedCount,
                ],
            ]);

            return [
                'imported_count' => $count,
                'created_count' => $createdCount,
                'updated_count' => $updatedCount,
            ];
        });
    }
}
