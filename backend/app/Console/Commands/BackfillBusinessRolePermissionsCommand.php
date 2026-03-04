<?php

namespace App\Console\Commands;

use App\Models\Business;
use App\Models\BusinessRolePermission;
use App\Support\PermissionCatalog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class BackfillBusinessRolePermissionsCommand extends Command
{
    protected $signature = 'businesses:backfill-role-permissions';

    protected $description = 'Corrige permisos por rol para negocios existentes usando upsert por negocio/rol/permiso.';

    public function handle(): int
    {
        $businessesProcessed = 0;
        $businessesFixed = 0;
        $insertedRows = 0;
        $updatedRows = 0;

        Business::query()
            ->select('id')
            ->orderBy('id')
            ->chunkById(100, function ($businesses) use (&$businessesProcessed, &$businessesFixed, &$insertedRows, &$updatedRows): void {
                foreach ($businesses as $business) {
                    $businessesProcessed++;

                    $defaults = $this->defaultRowsForBusiness($business->id);
                    $existing = BusinessRolePermission::query()
                        ->where('business_id', $business->id)
                        ->get(['role', 'permission_key', 'allowed'])
                        ->keyBy(fn (BusinessRolePermission $permission): string => $permission->role.'|'.$permission->permission_key);

                    $rowsToUpsert = [];
                    foreach ($defaults as $row) {
                        $key = $row['role'].'|'.$row['permission_key'];
                        $current = $existing->get($key);

                        if ($current === null) {
                            $insertedRows++;
                            $rowsToUpsert[] = $row;

                            continue;
                        }

                        if ((bool) $current->allowed !== $row['allowed']) {
                            $updatedRows++;
                            $rowsToUpsert[] = $row;
                        }
                    }

                    if ($rowsToUpsert === []) {
                        continue;
                    }

                    $businessesFixed++;

                    BusinessRolePermission::query()->upsert(
                        $rowsToUpsert,
                        ['business_id', 'role', 'permission_key'],
                        ['allowed', 'updated_at']
                    );
                }
            });

        $message = sprintf(
            'Backfill de permisos finalizado. Negocios procesados: %d. Negocios corregidos: %d. Filas insertadas: %d. Filas actualizadas: %d.',
            $businessesProcessed,
            $businessesFixed,
            $insertedRows,
            $updatedRows,
        );

        $this->info($message);
        Log::info($message, [
            'businesses_processed' => $businessesProcessed,
            'businesses_fixed' => $businessesFixed,
            'inserted_rows' => $insertedRows,
            'updated_rows' => $updatedRows,
        ]);

        return self::SUCCESS;
    }

    /**
     * @return list<array{business_id:int, role:string, permission_key:string, allowed:bool, created_at:mixed, updated_at:mixed}>
     */
    private function defaultRowsForBusiness(int $businessId): array
    {
        $rows = [];
        $timestamp = now();

        foreach (['owner', 'admin', 'cashier'] as $role) {
            foreach (PermissionCatalog::defaultsForRole($role) as $permissionKey => $allowed) {
                $rows[] = [
                    'business_id' => $businessId,
                    'role' => $role,
                    'permission_key' => $permissionKey,
                    'allowed' => (bool) $allowed,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }
        }

        return $rows;
    }
}
