<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class GoldenPathE2ETest extends TestCase
{
    use RefreshDatabase;

    public function test_golden_path_login_business_pos_checkout_and_reports(): void
    {
        $password = 'Password!123';
        $user = User::factory()->create(['password' => bcrypt($password)]);

        $business = Business::create(['name' => 'Golden Store', 'currency' => 'ARS']);
        DB::table('business_users')->insert([
            'user_id' => $user->id,
            'business_id' => $business->id,
            'role' => 'owner',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $login = $this->postJson('/protected/auth/login', [
            'email' => $user->email,
            'password' => $password,
        ]);

        $login->assertOk()->assertJsonPath('success', true);
        $token = $login->json('token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/protected/businesses/select', ['business_id' => $business->id])
            ->assertOk();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $business->id)
            ->postJson('/protected/cash-register/open', ['amount' => 0])
            ->assertOk();

        $itemResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $business->id)
            ->postJson('/protected/items', [
                'name' => 'Producto Golden',
                'price' => 1000,
            ])
            ->assertCreated();

        $itemId = $itemResponse->json('data.id');

        $cashMethodId = DB::table('payment_methods')->insertGetId([
            'code' => 'cash',
            'name' => 'Efectivo',
            'icon' => 1,
            'color' => '#fff',
        ]);

        $sale = $this->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $business->id)
            ->postJson('/protected/sales/start', [
                'items' => [[
                    'item_source' => 'local',
                    'item_id' => $itemId,
                    'quantity' => 1,
                ]],
                'payments' => [[
                    'payment_method_id' => $cashMethodId,
                    'amount' => 1000,
                ]],
            ])
            ->assertOk();

        $saleId = $sale->json('data.id');

        DB::table('sale_payments')->where('sale_id', $saleId)->update(['status' => 'confirmed']);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $business->id)
            ->postJson("/protected/sales/{$saleId}/close")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $business->id)
            ->getJson('/protected/reports/summary')
            ->assertOk()
            ->assertJsonPath('success', true);
    }
}
