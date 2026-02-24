<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureTokenIsFresh;
use App\Models\Business;
use App\Models\BusinessParameter;
use App\Models\Item;
use App\Models\SepaItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ItemCatalogPaginationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(EnsureTokenIsFresh::class);
    }

    public function test_index_returns_length_aware_pagination_meta_by_default(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        Item::query()->create([
            'business_id' => $business->id,
            'name' => 'Producto A',
            'barcode' => '1111111111111',
            'price' => 100,
        ]);

        Item::query()->create([
            'business_id' => $business->id,
            'name' => 'Producto B',
            'barcode' => '2222222222222',
            'price' => 120,
        ]);

        Sanctum::actingAs($user, ['front']);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/items?source=local&per_page=1')
            ->assertOk();

        $response
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('meta.last_page', 2);
    }


    public function test_index_honors_requested_page_number(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        Item::query()->create([
            'business_id' => $business->id,
            'name' => 'Producto A',
            'barcode' => '1111111111111',
            'price' => 100,
        ]);

        Item::query()->create([
            'business_id' => $business->id,
            'name' => 'Producto B',
            'barcode' => '2222222222222',
            'price' => 120,
        ]);

        Sanctum::actingAs($user, ['front']);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/items?source=local&per_page=1&page=2')
            ->assertOk();

        $response
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('data.0.name', 'Producto B');
    }

    public function test_source_all_includes_local_and_sepa_in_total_when_sepa_enabled(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        BusinessParameter::query()->create([
            'business_id' => $business->id,
            'parameter_id' => BusinessParameter::ENABLE_SEPA_ITEMS,
        ]);

        Item::query()->create([
            'business_id' => $business->id,
            'name' => 'Local Uno',
            'barcode' => '3333333333333',
            'price' => 200,
        ]);

        Item::query()->create([
            'business_id' => $business->id,
            'name' => 'Local Dos',
            'barcode' => '4444444444444',
            'price' => 250,
        ]);

        SepaItem::query()->create([
            'name' => 'Sepa Uno',
            'barcode' => '5555555555555',
            'price' => 300,
        ]);

        SepaItem::query()->create([
            'name' => 'Sepa Dos',
            'barcode' => '6666666666666',
            'price' => 350,
        ]);

        Sanctum::actingAs($user, ['front']);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/items?source=all&per_page=10')
            ->assertOk();

        $response
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.total', 4)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.last_page', 1);

        $sources = collect($response->json('data'))->pluck('source')->unique()->all();
        $this->assertContains('local', $sources);
        $this->assertContains('sepa', $sources);
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
