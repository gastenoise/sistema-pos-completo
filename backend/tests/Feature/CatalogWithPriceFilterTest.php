<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureTokenIsFresh;
use App\Models\Business;
use App\Models\BusinessParameter;
use App\Models\SepaItem;
use App\Models\SepaItemBusinessPrice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CatalogWithPriceFilterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(EnsureTokenIsFresh::class);
    }

    public function test_only_with_price_filter_hides_sepa_items_without_override(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        // Enable SEPA
        BusinessParameter::create([
            'business_id' => $business->id,
            'parameter_id' => BusinessParameter::ENABLE_SEPA_ITEMS,
            'value' => 'true'
        ]);

        // Create SEPA items
        $sepaWithPrice = SepaItem::create([
            'name' => 'SEPA con precio',
            'barcode' => '111',
            'price' => 100,
        ]);

        $sepaWithoutPrice = SepaItem::create([
            'name' => 'SEPA sin precio',
            'barcode' => '222',
            'price' => 200,
        ]);

        // Override price for the first one
        SepaItemBusinessPrice::create([
            'business_id' => $business->id,
            'sepa_item_id' => $sepaWithPrice->id,
            'price' => 150,
        ]);

        Sanctum::actingAs($user, ['front']);

        // Request with filter
        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/items?only_with_price=true&source=sepa')
            ->assertOk();

        $items = $response->json('data.data') ?? $response->json('data') ?? [];
        $ids = collect($items)->pluck('sepa_item_id')->all();

        $this->assertContains($sepaWithPrice->id, $ids);
        $this->assertNotContains($sepaWithoutPrice->id, $ids);
        $this->assertCount(1, $items);

        // Request without filter
        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/items?only_with_price=false&source=sepa')
            ->assertOk();

        $items = $response->json('data.data') ?? $response->json('data') ?? [];
        $this->assertCount(2, $items);
    }

    public function test_bulk_update_makes_sepa_item_visible_with_price_filter(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        BusinessParameter::create([
            'business_id' => $business->id,
            'parameter_id' => BusinessParameter::ENABLE_SEPA_ITEMS,
            'value' => 'true'
        ]);

        $sepaItem = SepaItem::create([
            'name' => 'SEPA invisible',
            'barcode' => '333',
            'price' => 300,
        ]);

        Sanctum::actingAs($user, ['front']);

        // Initially hidden
        $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/items?only_with_price=true&source=sepa')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        // Bulk update price
        $this->withHeader('X-Business-Id', (string) $business->id)
            ->patchJson('/protected/items/bulk', [
                'targets' => [
                    ['id' => $sepaItem->id, 'source' => 'sepa']
                ],
                'operation' => 'set_price',
                'price' => 350
            ])
            ->assertOk();

        // Now visible
        $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/items?only_with_price=true&source=sepa')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.sepa_item_id', $sepaItem->id)
            ->assertJsonPath('data.0.price', 350);
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
