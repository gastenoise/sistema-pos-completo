<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureTokenIsFresh;
use App\Models\Business;
use App\Models\BusinessParameter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BusinessUpdateParametersTest extends TestCase
{
    use RefreshDatabase;


    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(EnsureTokenIsFresh::class);
    }

    public function test_it_accepts_and_persists_enable_sepa_items_parameter(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        Sanctum::actingAs($user, ['front']);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson('/protected/business', [
                'business_parameters' => [
                    BusinessParameter::ENABLE_SEPA_ITEMS => true,
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.business_parameters.' . BusinessParameter::ENABLE_SEPA_ITEMS, true);

        $this->assertDatabaseHas('business_parameters', [
            'business_id' => $business->id,
            'parameter_id' => BusinessParameter::ENABLE_SEPA_ITEMS,
        ]);
    }


    public function test_it_accepts_and_persists_enable_barcode_scanner_parameter(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        Sanctum::actingAs($user, ['front']);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson('/protected/business', [
                'business_parameters' => [
                    BusinessParameter::ENABLE_BARCODE_SCANNER => false,
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonMissingPath('data.business_parameters.' . BusinessParameter::ENABLE_BARCODE_SCANNER);

        $this->assertDatabaseMissing('business_parameters', [
            'business_id' => $business->id,
            'parameter_id' => BusinessParameter::ENABLE_BARCODE_SCANNER,
        ]);
    }

    public function test_it_defaults_enable_barcode_scanner_to_true_when_parameter_is_absent(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        Sanctum::actingAs($user, ['front']);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson('/protected/business', [
                'business_parameters' => [
                    BusinessParameter::ENABLE_SEPA_ITEMS => true,
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.business_parameters.' . BusinessParameter::ENABLE_BARCODE_SCANNER, true);

        $this->assertDatabaseHas('business_parameters', [
            'business_id' => $business->id,
            'parameter_id' => BusinessParameter::ENABLE_BARCODE_SCANNER,
        ]);
    }
    public function test_business_parameters_validation_remains_backward_compatible(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        Sanctum::actingAs($user, ['front']);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson('/protected/business', [
                'business_parameters' => [
                    'legacy_custom_toggle' => true,
                    BusinessParameter::SHOW_CLOSED_SALE_AUTOMATICALLY => false,
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('business_parameters', [
            'business_id' => $business->id,
            'parameter_id' => 'legacy_custom_toggle',
        ]);

        $this->assertDatabaseMissing('business_parameters', [
            'business_id' => $business->id,
            'parameter_id' => BusinessParameter::SHOW_CLOSED_SALE_AUTOMATICALLY,
        ]);
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
}
