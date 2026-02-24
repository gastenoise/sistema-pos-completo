<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\CashRegisterSession;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CashRegisterExpectedTotalsTest extends TestCase
{
    use RefreshDatabase;

    public function test_expected_totals_only_include_closed_sales(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('cash-register-totals')->plainTextToken;

        $business = Business::create([
            'name' => 'Negocio caja',
            'currency' => 'ARS',
        ]);

        DB::table('business_users')->insert([
            'user_id' => $user->id,
            'business_id' => $business->id,
            'role' => 'owner',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $cashMethodId = DB::table('payment_methods')->insertGetId([
            'code' => 'cash',
            'name' => 'Efectivo',
            'icon' => 27,
            'color' => '#1ABC9C',
        ]);

        $cardMethodId = DB::table('payment_methods')->insertGetId([
            'code' => 'card',
            'name' => 'Tarjeta',
            'icon' => 20,
            'color' => '#0EA5E9',
        ]);

        $session = CashRegisterSession::create([
            'business_id' => $business->id,
            'opened_by' => $user->id,
            'opened_at' => now()->subHour(),
            'opening_cash_amount' => 100,
            'status' => 'open',
        ]);

        $closedSale = Sale::create([
            'business_id' => $business->id,
            'cash_register_session_id' => $session->id,
            'user_id' => $user->id,
            'status' => 'closed',
            'total_amount' => 200,
            'closed_at' => now()->subMinutes(30),
        ]);

        SalePayment::create([
            'sale_id' => $closedSale->id,
            'payment_method_id' => $cashMethodId,
            'amount' => 150,
            'status' => SalePayment::STATUS_CONFIRMED,
        ]);

        SalePayment::create([
            'sale_id' => $closedSale->id,
            'payment_method_id' => $cardMethodId,
            'amount' => 50,
            'status' => SalePayment::STATUS_CONFIRMED,
        ]);

        $openSale = Sale::create([
            'business_id' => $business->id,
            'cash_register_session_id' => $session->id,
            'user_id' => $user->id,
            'status' => 'open',
            'total_amount' => 999,
        ]);

        SalePayment::create([
            'sale_id' => $openSale->id,
            'payment_method_id' => $cashMethodId,
            'amount' => 999,
            'status' => SalePayment::STATUS_CONFIRMED,
        ]);

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $business->id)
            ->getJson("/protected/cash-register/{$session->id}/expected-totals");

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_sales', 200)
            ->assertJsonPath('data.sales_count', 1)
            ->assertJsonPath('data.cash_sales', 150)
            ->assertJsonPath('data.expected_cash', 250);

        $breakdown = collect($response->json('data.breakdown'));

        $this->assertEquals(150.0, (float) $breakdown->firstWhere('payment_method_id', $cashMethodId)['total']);
        $this->assertEquals(50.0, (float) $breakdown->firstWhere('payment_method_id', $cardMethodId)['total']);
    }
}
