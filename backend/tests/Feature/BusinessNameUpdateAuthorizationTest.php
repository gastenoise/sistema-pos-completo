<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureTokenIsFresh;
use App\Models\Business;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BusinessNameUpdateAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(EnsureTokenIsFresh::class);
    }

    public function test_owner_can_update_business_name(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        Sanctum::actingAs($user, ['front']);

        $newName = 'Nuevo Nombre del Negocio';

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson('/protected/business', [
                'name' => $newName,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', $newName);

        $this->assertDatabaseHas('businesses', [
            'id' => $business->id,
            'name' => $newName,
        ]);
    }

    public function test_admin_cannot_update_business_name(): void
    {
        [$adminUser, $business] = $this->createAuthenticatedAdmin();

        Sanctum::actingAs($adminUser, ['front']);

        $originalName = $business->name;
        $newName = 'Nombre No Autorizado';

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson('/protected/business', [
                'name' => $newName,
            ]);

        $response->assertForbidden();

        // Verificar que el nombre no cambió
        $business->refresh();
        $this->assertEquals($originalName, $business->name);
    }

    public function test_cashier_cannot_update_business_name(): void
    {
        [$cashierUser, $business] = $this->createAuthenticatedCashier();

        Sanctum::actingAs($cashierUser, ['front']);

        $originalName = $business->name;
        $newName = 'Nombre No Autorizado';

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson('/protected/business', [
                'name' => $newName,
            ]);

        $response->assertForbidden();

        // Verificar que el nombre no cambió
        $business->refresh();
        $this->assertEquals($originalName, $business->name);
    }

    public function test_owner_can_update_business_name_with_other_fields(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        Sanctum::actingAs($user, ['front']);

        $newName = 'Negocio Actualizado';
        $newAddress = 'Calle Falsa 123';
        $newPhone = '+54 9 11 1234 5678';

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson('/protected/business', [
                'name' => $newName,
                'address' => $newAddress,
                'phone' => $newPhone,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', $newName)
            ->assertJsonPath('data.address', $newAddress)
            ->assertJsonPath('data.phone', $newPhone);
    }

    public function test_business_name_validation_max_length(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        Sanctum::actingAs($user, ['front']);

        // Nombre demasiado largo (más de 255 caracteres)
        $tooLongName = str_repeat('A', 256);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson('/protected/business', [
                'name' => $tooLongName,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    private function createAuthenticatedOwner(): array
    {
        $user = User::factory()->create();
        $business = Business::create([
            'name' => 'Negocio Test',
            'currency' => 'ARS',
        ]);

        $user->businesses()->attach($business->id, ['role' => 'owner']);

        return [$user, $business];
    }

    private function createAuthenticatedAdmin(): array
    {
        $user = User::factory()->create();
        $business = Business::create([
            'name' => 'Negocio Test Admin',
            'currency' => 'ARS',
        ]);

        $user->businesses()->attach($business->id, ['role' => 'admin']);

        return [$user, $business];
    }

    private function createAuthenticatedCashier(): array
    {
        $user = User::factory()->create();
        $business = Business::create([
            'name' => 'Negocio Test Cashier',
            'currency' => 'ARS',
        ]);

        $user->businesses()->attach($business->id, ['role' => 'cashier']);

        return [$user, $business];
    }
}
