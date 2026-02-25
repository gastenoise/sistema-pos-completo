<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureTokenIsFresh;
use App\Models\Business;
use App\Models\BusinessRolePermission;
use App\Models\User;
use App\Support\PermissionCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RolePermissionControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(EnsureTokenIsFresh::class);
    }

    public function test_owner_can_read_role_permissions_grouped_by_module(): void
    {
        [$user, $business] = $this->createUserInBusiness('owner');
        Sanctum::actingAs($user, ['front']);

        BusinessRolePermission::create([
            'business_id' => $business->id,
            'role' => 'cashier',
            'permission_key' => PermissionCatalog::CASH_REGISTER_VIEW,
            'allowed' => true,
        ]);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/business/role-permissions');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.roles.0', 'owner')
            ->assertJsonPath('data.permissions.cash_register.0.permission_key', PermissionCatalog::CASH_REGISTER_VIEW)
            ->assertJsonPath('data.permissions.cash_register.0.allowed_by_role.cashier', true);
    }

    public function test_cashier_cannot_read_role_permissions(): void
    {
        [$user, $business] = $this->createUserInBusiness('cashier');
        Sanctum::actingAs($user, ['front']);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/business/role-permissions');

        $response->assertForbidden();
    }

    public function test_admin_can_update_role_permissions_with_valid_payload(): void
    {
        [$user, $business] = $this->createUserInBusiness('admin');
        Sanctum::actingAs($user, ['front']);

        $payload = [
            'role_permissions' => [
                [
                    'role' => 'cashier',
                    'permission_key' => PermissionCatalog::CASH_REGISTER_OPEN,
                    'allowed' => true,
                ],
                [
                    'role' => 'cashier',
                    'permission_key' => PermissionCatalog::CASH_REGISTER_CLOSE,
                    'allowed' => false,
                ],
            ],
        ];

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson('/protected/business/role-permissions', $payload);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.permissions.cash_register.1.allowed_by_role.cashier', true);

        $this->assertDatabaseHas('business_role_permissions', [
            'business_id' => $business->id,
            'role' => 'cashier',
            'permission_key' => PermissionCatalog::CASH_REGISTER_OPEN,
            'allowed' => true,
        ]);
    }

    public function test_update_validates_role_and_permission_key_against_catalogs(): void
    {
        [$user, $business] = $this->createUserInBusiness('owner');
        Sanctum::actingAs($user, ['front']);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson('/protected/business/role-permissions', [
                'role_permissions' => [
                    [
                        'role' => 'manager',
                        'permission_key' => 'otro.permiso',
                        'allowed' => true,
                    ],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'role_permissions.0.role',
                'role_permissions.0.permission_key',
            ]);
    }

    public function test_auth_permissions_endpoint_returns_effective_permissions_grouped_by_module(): void
    {
        [$user, $business] = $this->createUserInBusiness('admin');
        Sanctum::actingAs($user, ['front']);

        BusinessRolePermission::create([
            'business_id' => $business->id,
            'role' => 'admin',
            'permission_key' => PermissionCatalog::CASH_REGISTER_VIEW,
            'allowed' => true,
        ]);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/auth/permissions');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonFragment([PermissionCatalog::CASH_REGISTER_VIEW => true])
            ->assertJsonPath('data.permissions_by_module.cash_register.view', true);
    }

    private function createUserInBusiness(string $role): array
    {
        $user = User::factory()->create();
        $business = Business::create([
            'name' => 'Negocio Permisos',
            'currency' => 'ARS',
        ]);

        $user->businesses()->attach($business->id, ['role' => $role]);

        return [$user, $business];
    }
}
