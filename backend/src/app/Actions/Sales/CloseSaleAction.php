<?php

namespace App\Actions\Sales;

use App\Models\Sale;

class CloseSaleAction
{
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

        return ['success' => true, 'message' => 'Sale finalized', 'status' => 200];
    }
}
