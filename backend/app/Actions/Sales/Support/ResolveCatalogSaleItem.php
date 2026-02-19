<?php

namespace App\Actions\Sales\Support;

use App\Models\Category;
use App\Models\Item;
use App\Models\SepaItem;
use App\Models\SepaItemBusinessPrice;
use App\Models\Sale;
use Illuminate\Validation\ValidationException;

class ResolveCatalogSaleItem
{
    public function execute(Sale $sale, array $rawItem): array
    {
        $itemSource = $this->resolveSource($rawItem);

        if ($itemSource === 'sepa') {
            return $this->resolveSepaItem($sale, $rawItem);
        }

        return $this->resolveLocalItem($sale, $rawItem);
    }

    private function resolveSource(array $rawItem): string
    {
        if (!empty($rawItem['item_source']) && in_array($rawItem['item_source'], ['local', 'sepa'], true)) {
            return $rawItem['item_source'];
        }

        if (!empty($rawItem['sepa_item_id'])) {
            return 'sepa';
        }

        return 'local';
    }

    private function resolveLocalItem(Sale $sale, array $rawItem): array
    {
        $itemId = (int) ($rawItem['item_id'] ?? 0);
        $item = Item::query()
            ->where('business_id', $sale->business_id)
            ->find($itemId);

        if (!$item) {
            throw ValidationException::withMessages([
                'item_id' => ['El ítem local no pertenece al negocio actual.'],
            ]);
        }

        $basePrice = (float) $item->price;
        $effectivePrice = array_key_exists('unit_price_override', $rawItem)
            ? (float) $rawItem['unit_price_override']
            : $basePrice;

        return [
            'item_source' => 'local',
            'item_id' => $item->id,
            'sepa_item_id' => null,
            'item_name_snapshot' => $item->name,
            'barcode_snapshot' => $item->barcode,
            'category_id_snapshot' => $item->category_id,
            'unit_price_snapshot' => $effectivePrice,
            'category_name_snapshot' => $item->category?->name,
        ];
    }

    private function resolveSepaItem(Sale $sale, array $rawItem): array
    {
        $sepaItemId = (int) ($rawItem['sepa_item_id'] ?? 0);
        $sepaItem = SepaItem::find($sepaItemId);

        if (!$sepaItem) {
            throw ValidationException::withMessages([
                'sepa_item_id' => ['El ítem SEPA no existe.'],
            ]);
        }

        $businessOverride = SepaItemBusinessPrice::query()
            ->where('business_id', $sale->business_id)
            ->where('sepa_item_id', $sepaItem->id)
            ->first(['price', 'category_id']);

        $businessPrice = $businessOverride?->price;
        $categorySnapshotId = $businessOverride?->category_id !== null ? (int) $businessOverride->category_id : null;
        $categorySnapshotName = $categorySnapshotId !== null
            ? Category::query()->find($categorySnapshotId)?->name
            : null;

        $basePrice = $businessPrice !== null ? (float) $businessPrice : (float) $sepaItem->price;
        $effectivePrice = array_key_exists('unit_price_override', $rawItem)
            ? (float) $rawItem['unit_price_override']
            : $basePrice;

        return [
            'item_source' => 'sepa',
            'item_id' => null,
            'sepa_item_id' => $sepaItem->id,
            'item_name_snapshot' => $sepaItem->name,
            'barcode_snapshot' => $sepaItem->barcode,
            'category_id_snapshot' => $categorySnapshotId,
            'unit_price_snapshot' => $effectivePrice,
            'category_name_snapshot' => $categorySnapshotName,
        ];
    }
}

