<?php

namespace App\Actions\Sales;

use App\Models\Sale;
use App\Services\Items\RecentItemUsageService;

class CloseSaleAction
{
    public function __construct(private readonly RecentItemUsageService $recentItemUsageService)
    {
    }

    public function execute(Sale $sale): array
    {
        if ($sale->items()->count() === 0) {
            return ['success' => false, 'message' => 'Cannot close an empty sale', 'status' => 422];
        }

        $unconfirmedPayments = $sale->payments()->where('status', '!=', 'confirmed')->count();
        if ($unconfirmedPayments > 0) {
            return ['success' => false, 'message' => 'All payments must be confirmed before closing sale', 'status' => 422];
        }

        $totalPaid = $sale->payments()->where('status', 'confirmed')->sum('amount');
        if ($totalPaid < $sale->total_amount) {
            return [
                'success' => false,
                'message' => 'Insufficient confirmed payments',
                'pending' => $sale->total_amount - $totalPaid,
                'status' => 422,
            ];
        }

        $sale->update([
            'status' => 'closed',
            'closed_at' => now(),
        ]);


        $sale->loadMissing('items');
        foreach ($sale->items as $saleItem) {
            $source = $saleItem->sepa_item_id ? 'sepa' : 'local';
            $itemId = $saleItem->sepa_item_id ? (int) $saleItem->sepa_item_id : (int) $saleItem->item_id;
            if ($itemId > 0) {
                $this->recentItemUsageService->record((int) $sale->business_id, $source, $itemId, (int) ($saleItem->quantity ?? 1));
            }
        }

        return ['success' => true, 'message' => 'Sale finalized', 'status' => 200];
    }
}
