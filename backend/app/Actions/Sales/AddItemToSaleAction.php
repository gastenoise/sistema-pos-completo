<?php

namespace App\Actions\Sales;

use App\Actions\Sales\Support\ResolveCatalogSaleItem;
use App\Models\Sale;

class AddItemToSaleAction
{
    public function __construct(private readonly ResolveCatalogSaleItem $resolveCatalogSaleItem)
    {
    }

    public function execute(Sale $sale, array $validated): Sale
    {
        $quantity = (int) $validated['quantity'];
        $resolvedItem = $this->resolveCatalogSaleItem->execute($sale, $validated);
        $total = $resolvedItem['unit_price_snapshot'] * $quantity;

        $sale->items()->create([
            'item_source' => $resolvedItem['item_source'],
            'item_id' => $resolvedItem['item_id'],
            'sepa_item_id' => $resolvedItem['sepa_item_id'],
            'item_name_snapshot' => $resolvedItem['item_name_snapshot'],
            'barcode_snapshot' => $resolvedItem['barcode_snapshot'],
            'unit_price_snapshot' => $resolvedItem['unit_price_snapshot'],
            'category_id_snapshot' => $resolvedItem['category_id_snapshot'],
            'category_name_snapshot' => $resolvedItem['category_name_snapshot'] ?? null,
            'quantity' => $quantity,
            'total' => $total,
        ]);

        $sale->calculateTotal();

        return $sale->load(['items.item.category', 'items.sepaItem', 'items.categorySnapshot']);
    }
}
