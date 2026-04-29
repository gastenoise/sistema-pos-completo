<?php

namespace Tests\Feature;

use App\Actions\Business\BootstrapBusinessRolePermissionsAction;
use App\Models\Business;
use App\Support\PermissionCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BootstrapBusinessRolePermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_bootstraps_default_permissions_per_role_for_business(): void
    {
        $business = Business::create([
            'name' => 'Comercio permisos',
            'currency' => 'ARS',
        ]);

        app(BootstrapBusinessRolePermissionsAction::class)->execute($business->id);

        foreach (['owner', 'admin'] as $role) {
            foreach (PermissionCatalog::all() as $permissionKey) {
                $this->assertDatabaseHas('business_role_permissions', [
                    'business_id' => $business->id,
                    'role' => $role,
                    'permission_key' => $permissionKey,
                    'allowed' => true,
                ]);
            }
        }

        foreach (PermissionCatalog::all() as $permissionKey) {
            $this->assertDatabaseHas('business_role_permissions', [
                'business_id' => $business->id,
                'role' => 'cashier',
                'permission_key' => $permissionKey,
                'allowed' => false,
            ]);
        }

        $this->assertEquals(
            15,
            DB::table('business_role_permissions')->where('business_id', $business->id)->count()
        );
    }
}
