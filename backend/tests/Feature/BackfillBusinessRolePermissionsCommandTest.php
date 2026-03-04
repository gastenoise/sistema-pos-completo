<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessRolePermission;
use App\Support\PermissionCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BackfillBusinessRolePermissionsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_backfills_missing_rows_and_corrects_outdated_permissions(): void
    {
        $legacyBusinessId = DB::table('businesses')->insertGetId([
            'name' => 'Negocio legacy',
            'currency' => 'ARS',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $alreadySyncedBusiness = Business::create([
            'name' => 'Negocio al día',
            'currency' => 'ARS',
        ]);

        app(\App\Actions\Business\BootstrapBusinessRolePermissionsAction::class)->execute($alreadySyncedBusiness->id);

        BusinessRolePermission::create([
            'business_id' => $legacyBusinessId,
            'role' => 'owner',
            'permission_key' => PermissionCatalog::CASH_REGISTER_VIEW,
            'allowed' => false,
        ]);

        Artisan::call('businesses:backfill-role-permissions');
        $output = Artisan::output();

        $this->assertStringContainsString('Negocios procesados: 2', $output);
        $this->assertStringContainsString('Negocios corregidos: 1', $output);
        $this->assertStringContainsString('Filas insertadas: 11', $output);
        $this->assertStringContainsString('Filas actualizadas: 1', $output);

        foreach (['owner', 'admin'] as $role) {
            foreach (PermissionCatalog::all() as $permissionKey) {
                $this->assertDatabaseHas('business_role_permissions', [
                    'business_id' => $legacyBusinessId,
                    'role' => $role,
                    'permission_key' => $permissionKey,
                    'allowed' => true,
                ]);
            }
        }

        foreach (PermissionCatalog::all() as $permissionKey) {
            $this->assertDatabaseHas('business_role_permissions', [
                'business_id' => $legacyBusinessId,
                'role' => 'cashier',
                'permission_key' => $permissionKey,
                'allowed' => false,
            ]);
        }
    }
}
