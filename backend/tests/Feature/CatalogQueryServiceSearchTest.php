<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureTokenIsFresh;
use App\Models\Business;
use App\Models\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CatalogQueryServiceSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(EnsureTokenIsFresh::class);
    }

    public function test_numeric_search_prioritizes_barcode_matches_only(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        Item::query()->create([
            'business_id' => $business->id,
            'name' => 'Aceite 7791 especial',
            'barcode' => '1234567890123',
            'price' => 1000,
        ]);

        $barcodeMatch = Item::query()->create([
            'business_id' => $business->id,
            'name' => 'Aceite Premium',
            'barcode' => '7791000000001',
            'price' => 1500,
        ]);

        Sanctum::actingAs($user, ['front']);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/items?search=7791&source=local')
            ->assertOk();

        $items = $response->json('data.data') ?? $response->json('data') ?? [];

        $this->assertCount(1, $items);
        $this->assertSame($barcodeMatch->id, $items[0]['id']);
        $this->assertSame('7791000000001', $items[0]['barcode']);
    }

    public function test_text_search_uses_name_and_sku_filters(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();

        $nameMatch = Item::query()->create([
            'business_id' => $business->id,
            'name' => 'Galletitas de Avena',
            'barcode' => '1111111111111',
            'price' => 700,
        ]);

        $skuMatch = Item::query()->create([
            'business_id' => $business->id,
            'name' => 'Producto sin match de nombre',
            'sku' => 'AVENA-123',
            'barcode' => '2222222222222',
            'price' => 850,
        ]);

        Sanctum::actingAs($user, ['front']);

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/items?search=avena&source=local')
            ->assertOk();

        $items = $response->json('data.data') ?? $response->json('data') ?? [];
        $ids = collect($items)->pluck('id')->all();

        $this->assertContains($nameMatch->id, $ids);
        $this->assertContains($skuMatch->id, $ids);
    }

    public function test_explain_plan_uses_business_barcode_index_for_prefix_query(): void
    {
        $driver = DB::getDriverName();

        if ($driver !== 'sqlite') {
            $this->markTestSkipped('SQLite explain plan assertion only applies in test environment.');
        }

        [$user, $business] = $this->createAuthenticatedOwner();
        Sanctum::actingAs($user, ['front']);

        Item::query()->create([
            'business_id' => $business->id,
            'name' => 'Producto índice',
            'barcode' => '7791888888888',
            'price' => 999,
        ]);

        $plan = DB::select(
            'EXPLAIN QUERY PLAN SELECT id FROM items WHERE business_id = ? AND barcode LIKE ?',
            [$business->id, '7791%']
        );

        $this->assertNotEmpty($plan);

        $details = collect($plan)
            ->map(fn ($row) => (string) ($row->detail ?? ''))
            ->implode(' | ');

        $this->assertStringContainsString('items_business_barcode_idx', $details);
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
