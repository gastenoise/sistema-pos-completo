<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ItemImportContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_preview_returns_expected_contract(): void
    {
        [$token, $businessId] = $this->authContext();

        $file = UploadedFile::fake()->createWithContent('items.csv', "name,barcode,price\nYerba,779111,1000\n");

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $businessId)
            ->post('/protected/items-import/preview', [
                'file' => $file,
            ]);

        $response
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'columns',
                    'sample',
                    'total_rows',
                    'parsing_errors',
                    'preview_id',
                    'delimiter',
                    'estimated_metrics',
                ],
            ])
            ->assertJsonPath('success', true);
    }

    public function test_import_confirm_returns_estimated_metrics_in_payload(): void
    {
        [$token, $businessId] = $this->authContext();

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $businessId)
            ->postJson('/protected/items-import/confirm', [
                'items' => [
                    [
                        'name' => 'Azucar',
                        'barcode' => '779222',
                        'price' => 800,
                    ],
                ],
            ]);

        $response
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'imported_count',
                    'created_count',
                    'updated_count',
                    'estimated_metrics' => ['to_create', 'to_update'],
                ],
            ])
            ->assertJsonPath('success', true);
    }

    private function authContext(): array
    {
        $user = User::factory()->create();
        $token = $user->createToken('items-import-contract')->plainTextToken;

        $business = Business::create([
            'name' => 'Importaciones SA',
            'currency' => 'ARS',
        ]);

        DB::table('business_users')->insert([
            'user_id' => $user->id,
            'business_id' => $business->id,
            'role' => 'owner',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$token, $business->id];
    }
}
