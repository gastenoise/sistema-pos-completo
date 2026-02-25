<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessRolePermission;
use App\Models\User;
use App\Services\Authorization\BusinessPermissionResolver;
use App\Support\PermissionCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BusinessPermissionResolverTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_has_all_known_permissions_enabled(): void
    {
        $user = User::factory()->create();
        $business = Business::create([
            'name' => 'Negocio owner',
            'currency' => 'ARS',
        ]);

        $user->businesses()->attach($business->id, ['role' => 'owner']);

        $resolver = app(BusinessPermissionResolver::class);
        $result = $resolver->resolve($user, $business->id);

        $this->assertSame('owner', $result['role']);

        foreach (PermissionCatalog::all() as $permissionKey) {
            $this->assertTrue($result['permissions'][$permissionKey]);
            $this->assertTrue($resolver->can($permissionKey));
        }

        $this->assertFalse($resolver->can('permission.desconocido'));
    }

    public function test_admin_permissions_are_resolved_from_database_and_unknown_keys_are_denied(): void
    {
        $user = User::factory()->create();
        $business = Business::create([
            'name' => 'Negocio admin',
            'currency' => 'ARS',
        ]);

        $user->businesses()->attach($business->id, ['role' => 'admin']);

        BusinessRolePermission::create([
            'business_id' => $business->id,
            'role' => 'admin',
            'permission_key' => PermissionCatalog::CASH_REGISTER_VIEW,
            'allowed' => true,
        ]);

        BusinessRolePermission::create([
            'business_id' => $business->id,
            'role' => 'admin',
            'permission_key' => PermissionCatalog::SETTINGS_PERMISSIONS_MANAGE,
            'allowed' => false,
        ]);

        BusinessRolePermission::create([
            'business_id' => $business->id,
            'role' => 'admin',
            'permission_key' => 'permiso.no.catalogado',
            'allowed' => true,
        ]);

        $resolver = app(BusinessPermissionResolver::class);
        $result = $resolver->resolve($user, $business->id);

        $this->assertSame('admin', $result['role']);
        $this->assertTrue($result['permissions'][PermissionCatalog::CASH_REGISTER_VIEW]);
        $this->assertFalse($result['permissions'][PermissionCatalog::SETTINGS_PERMISSIONS_MANAGE]);
        $this->assertFalse($resolver->can('permiso.no.catalogado'));
        $this->assertFalse($resolver->can('otro.desconocido'));
    }
}
