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

class CashRegisterPermissionAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(EnsureTokenIsFresh::class);
    }

    public function test_owner_and_admin_can_update_role_permissions(): void
    {
        [$owner, $business] = $this->createUserInBusiness('owner');
        Sanctum::actingAs($owner, ['front']);

        $payload = [
            'role_permissions' => [
                [
                    'role' => 'cashier',
                    'permission_key' => PermissionCatalog::CASH_REGISTER_VIEW,
                    'allowed' => true,
                ],
            ],
        ];

        $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson('/protected/business/role-permissions', $payload)
            ->assertOk();

        [$admin, $sameBusiness] = $this->createUserInBusiness('admin', $business);
        Sanctum::actingAs($admin, ['front']);

        $this->withHeader('X-Business-Id', (string) $sameBusiness->id)
            ->putJson('/protected/business/role-permissions', $payload)
            ->assertOk();

        $this->assertDatabaseHas('business_role_permissions', [
            'business_id' => $business->id,
            'role' => 'cashier',
            'permission_key' => PermissionCatalog::CASH_REGISTER_VIEW,
            'allowed' => true,
        ]);
    }

    public function test_cashier_without_cash_register_view_gets_403_on_status_and_closed_sessions(): void
    {
        [$cashier, $business] = $this->createUserInBusiness('cashier');
        Sanctum::actingAs($cashier, ['front']);

        $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/cash-register/status')
            ->assertForbidden();

        $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/cash-register/sessions/closed')
            ->assertForbidden();
    }

    public function test_cashier_without_cash_register_open_gets_403_on_open(): void
    {
        [$cashier, $business] = $this->createUserInBusiness('cashier');
        Sanctum::actingAs($cashier, ['front']);

        BusinessRolePermission::create([
            'business_id' => $business->id,
            'role' => 'cashier',
            'permission_key' => PermissionCatalog::CASH_REGISTER_VIEW,
            'allowed' => true,
        ]);

        $this->withHeader('X-Business-Id', (string) $business->id)
            ->postJson('/protected/cash-register/open', ['amount' => 1000])
            ->assertForbidden();
    }

    public function test_cashier_without_cash_register_close_gets_403_on_close(): void
    {
        [$cashier, $business] = $this->createUserInBusiness('cashier');
        Sanctum::actingAs($cashier, ['front']);

        BusinessRolePermission::create([
            'business_id' => $business->id,
            'role' => 'cashier',
            'permission_key' => PermissionCatalog::CASH_REGISTER_VIEW,
            'allowed' => true,
        ]);

        BusinessRolePermission::create([
            'business_id' => $business->id,
            'role' => 'cashier',
            'permission_key' => PermissionCatalog::CASH_REGISTER_OPEN,
            'allowed' => true,
        ]);

        $this->withHeader('X-Business-Id', (string) $business->id)
            ->postJson('/protected/cash-register/close', ['real_cash' => 1500])
            ->assertForbidden();
    }

    private function createUserInBusiness(string $role, ?Business $business = null): array
    {
        $user = User::factory()->create();
        $business ??= Business::create([
            'name' => 'Negocio Caja Permisos',
            'currency' => 'ARS',
        ]);

        $user->businesses()->attach($business->id, ['role' => $role]);

        return [$user, $business];
    }
}
