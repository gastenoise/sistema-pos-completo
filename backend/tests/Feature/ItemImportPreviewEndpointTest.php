<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureTokenIsFresh;
use App\Models\Business;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ItemImportPreviewEndpointTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(EnsureTokenIsFresh::class);
    }

    public function test_preview_endpoint_returns_metadata_and_preview_id(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();
        Sanctum::actingAs($user, ['front']);

        $file = UploadedFile::fake()->createWithContent('items.csv', "name,barcode,price\nYerba,123,1500\nAzucar,456,1200\n");

        $response = $this->withHeader('X-Business-Id', (string) $business->id)
            ->postJson('/protected/items-import/preview', [
                'file' => $file,
            ])
            ->assertOk();

        $response
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.columns.0', 'name')
            ->assertJsonPath('data.total_rows', 2)
            ->assertJsonPath('data.delimiter', ',');

        $this->assertNotEmpty($response->json('data.preview_id'));
    }

    public function test_preview_full_endpoint_uses_preview_id_and_returns_paginated_rows(): void
    {
        [$user, $business] = $this->createAuthenticatedOwner();
        Sanctum::actingAs($user, ['front']);

        $file = UploadedFile::fake()->createWithContent('items.csv', "name,barcode,price\nYerba,123,1500\nAzucar,456,1200\nCafe,789,2200\n");

        $preview = $this->withHeader('X-Business-Id', (string) $business->id)
            ->postJson('/protected/items-import/preview', ['file' => $file])
            ->assertOk();

        $previewId = $preview->json('data.preview_id');

        $full = $this->withHeader('X-Business-Id', (string) $business->id)
            ->postJson('/protected/items-import/preview/full', [
                'preview_id' => $previewId,
                'page' => 2,
                'per_page' => 1,
            ])
            ->assertOk();

        $full
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.pagination.current_page', 2)
            ->assertJsonPath('data.pagination.per_page', 1)
            ->assertJsonPath('data.rows.0.name', 'Azucar');
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
