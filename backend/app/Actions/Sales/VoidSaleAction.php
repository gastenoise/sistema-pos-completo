<?php

namespace App\Actions\Sales;

use App\Models\Sale;
use App\Models\User;
use App\Services\Authorization\BusinessPermissionResolver;
use App\Support\PermissionCatalog;

class VoidSaleAction
{
    public function execute(Sale $sale, ?User $user, ?int $businessId, string $reason): array
    {
        if (!$businessId || !$user || !$sale->business_id || (int) $sale->business_id !== (int) $businessId) {
            return ['success' => false, 'message' => 'Sale not found', 'status' => 404];
        }

        $permissionResolver = app(BusinessPermissionResolver::class);
        $permissionResolver->resolve($user, $businessId);

        if (!$permissionResolver->can(PermissionCatalog::SALES_VOID)) {
            return [
                'success' => false,
                'message' => 'No tienes permiso para anular ventas.',
                'error' => 'forbidden',
                'status' => 403,
            ];
        }

        if ($sale->status === 'voided') {
            return ['success' => false, 'message' => 'Sale already voided', 'status' => 400];
        }

        if ($sale->status !== 'closed') {
            return ['success' => false, 'message' => 'Only closed sales can be voided', 'status' => 400];
        }

        $sale->update([
            'status' => 'voided',
            'voided_at' => now(),
            'voided_by' => $user->id,
            'void_reason' => $reason,
        ]);

        return ['success' => true, 'message' => 'Sale voided successfully', 'status' => 200];
    }
}
