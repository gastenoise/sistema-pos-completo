<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureTokenIsFresh;
use App\Models\Business;
use App\Models\BusinessParameter;
use App\Models\SepaItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SepaItemPriceOverrideTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(EnsureTokenIsFresh::class);
    }

    public function test_it_upserts_sepa_price_override_when_business_has_sepa_enabled(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        BusinessParameter::query()->create([
            'business_id' => $business->id,
            'parameter_id' => BusinessParameter::ENABLE_SEPA_ITEMS,
        ]);

        $sepaItem = SepaItem::query()->create([
            'name' => 'Yerba Test',
            'barcode' => '7791234567890',
            'price' => 1000,
        ]);

        Sanctum::actingAs($user, ['front']);

        $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson("/protected/sepa-items/{$sepaItem->id}/price", [
                'price' => 1250.5,
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.source', 'sepa')
            ->assertJsonPath('data.sepa_item_id', $sepaItem->id)
            ->assertJsonPath('data.price', 1250.5)
            ->assertJsonPath('data.is_price_overridden', true);

        $this->assertDatabaseHas('sepa_item_business_prices', [
            'business_id' => $business->id,
            'sepa_item_id' => $sepaItem->id,
            'price' => 1250.50,
        ]);

        $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson("/protected/sepa-items/{$sepaItem->id}/price", [
                'price' => 1300,
            ])
            ->assertOk()
            ->assertJsonPath('data.price', 1300);

        $this->assertDatabaseCount('sepa_item_business_prices', 1);
        $this->assertDatabaseHas('sepa_item_business_prices', [
            'business_id' => $business->id,
            'sepa_item_id' => $sepaItem->id,
            'price' => 1300.00,
        ]);
    }


    public function test_it_can_filter_catalog_to_only_sepa_items_with_overridden_price(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        BusinessParameter::query()->create([
            'business_id' => $business->id,
            'parameter_id' => BusinessParameter::ENABLE_SEPA_ITEMS,
        ]);

        SepaItem::query()->create([
            'name' => 'Fideos Base',
            'barcode' => '7791000000001',
            'price' => 900,
        ]);

        $overriddenSepaItem = SepaItem::query()->create([
            'name' => 'Arroz Override',
            'barcode' => '7791000000002',
            'price' => 1200,
        ]);

        Sanctum::actingAs($user, ['front']);

        $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson("/protected/sepa-items/{$overriddenSepaItem->id}/price", [
                'price' => 1500,
            ])
            ->assertOk();

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/items?only_sepa_price_overridden=true')
            ->assertOk();

        $items = $response->json('data.data');

        $this->assertCount(1, $items);
        $this->assertSame('sepa', $items[0]['source']);
        $this->assertSame($overriddenSepaItem->id, $items[0]['sepa_item_id']);
        $this->assertTrue($items[0]['is_price_overridden']);
    }

    public function test_it_forbids_override_when_business_sepa_flag_is_disabled(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        $sepaItem = SepaItem::query()->create([
            'name' => 'Azúcar Test',
            'barcode' => '7790987654321',
            'price' => 800,
        ]);

        Sanctum::actingAs($user, ['front']);

        $this->withHeader('X-Business-Id', (string) $business->id)
            ->putJson("/protected/sepa-items/{$sepaItem->id}/price", [
                'price' => 900,
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('sepa_item_business_prices', 0);
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
