<?php

namespace App\Actions\Sales;

use App\Models\Item;
use App\Models\Sale;

class AddItemToSaleAction
{
    public function execute(Sale $sale, array $validated): Sale
    {
        $item = Item::findOrFail($validated['item_id']);

        $price = $validated['unit_price_override'] ?? $item->price;
        $total = $price * $validated['quantity'];

        $sale->items()->create([
            'item_id' => $item->id,
            'item_name_snapshot' => $item->name,
            'unit_price_snapshot' => $price,
            'item_type_snapshot' => 'product',
            'category_id_snapshot' => $item->category_id,
            'quantity' => $validated['quantity'],
            'total' => $total,
        ]);

        $sale->calculateTotal();

        return $sale->load('items');
    }
}
