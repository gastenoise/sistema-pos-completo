<?php

namespace App\Actions\Business;

use App\Models\BusinessRolePermission;
use App\Support\PermissionCatalog;
use Illuminate\Support\Facades\DB;

class BootstrapBusinessRolePermissionsAction
{
    public function execute(int $businessId): void
    {
        DB::transaction(function () use ($businessId): void {
            $rows = [];
            $roles = ['owner', 'admin', 'cashier'];

            foreach ($roles as $role) {
                foreach (PermissionCatalog::defaultsForRole($role) as $permissionKey => $allowed) {
                    $rows[] = [
                        'business_id' => $businessId,
                        'role' => $role,
                        'permission_key' => $permissionKey,
                        'allowed' => (bool) $allowed,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }

            BusinessRolePermission::upsert(
                $rows,
                ['business_id', 'role', 'permission_key'],
                ['allowed', 'updated_at']
            );
        });
    }
}
