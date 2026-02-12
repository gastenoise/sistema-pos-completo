<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ReportSummaryAggregationTest extends TestCase
{
    use RefreshDatabase;

    public function test_sales_summary_matches_expected_aggregates_without_mass_loading_sales(): void
    {
        [$token, $businessId] = $this->seedReportScenario();

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $businessId)
            ->getJson('/protected/reports/summary?start_date=2024-01-01&end_date=2024-01-31&include_voided=1');

        $response->assertOk();

        $data = $response->json('data');

        $this->assertEquals(30.50, (float) $data['summary']['total_sales']);
        $this->assertSame(2, (int) $data['summary']['sales_count']);
        $this->assertSame(1, (int) $data['summary']['voided_count']);

        $totalsByStatus = collect($data['totals_by_status'])->keyBy('status');
        $this->assertEquals(30.50, (float) $totalsByStatus['closed']['total_amount']);
        $this->assertSame(2, (int) $totalsByStatus['closed']['count']);
        $this->assertEquals(5.00, (float) $totalsByStatus['voided']['total_amount']);
        $this->assertSame(1, (int) $totalsByStatus['voided']['count']);

        $totalsByPayment = collect($data['totals_by_payment_method'])->keyBy('code');
        $this->assertEquals(30.50, (float) $totalsByPayment['cash']['total_amount']);
        $this->assertSame(2, (int) $totalsByPayment['cash']['payments_count']);
        $this->assertEquals(15.00, (float) $totalsByPayment['card']['total_amount']);
        $this->assertSame(1, (int) $totalsByPayment['card']['payments_count']);

        $totalsByCategory = collect($data['totals_by_category'])->keyBy('name');
        $this->assertEquals(20.50, (float) $totalsByCategory['Bebidas']['total_amount']);
        $this->assertEquals(10.00, (float) $totalsByCategory['Sin categoría']['total_amount']);
    }

    public function test_daily_summary_returns_exact_totals_via_sql_aggregates(): void
    {
        [$token, $businessId] = $this->seedReportScenario();

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $businessId)
            ->getJson('/protected/reports/daily-summary?date=2024-01-15&include_voided=1');

        $response->assertOk()
            ->assertJsonPath('data.total_sales', 20.5)
            ->assertJsonPath('data.sales_count', 1)
            ->assertJsonPath('data.voided_count', 1);
    }

    private function seedReportScenario(): array
    {
        $user = User::factory()->create();
        $token = $user->createToken('reports')->plainTextToken;

        $businessId = DB::table('businesses')->insertGetId([
            'name' => 'Demo Business',
            'currency' => 'ARS',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('business_users')->insert([
            'user_id' => $user->id,
            'business_id' => $businessId,
            'role' => 'owner',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('payment_methods')->insert([
            ['id' => 1, 'code' => 'cash', 'name' => 'Efectivo', 'color' => 1],
            ['id' => 2, 'code' => 'card', 'name' => 'Tarjeta', 'color' => 2],
        ]);

        $sessionId = DB::table('cash_register_sessions')->insertGetId([
            'business_id' => $businessId,
            'opened_by' => $user->id,
            'opened_at' => '2024-01-01 08:00:00',
            'opening_cash_amount' => 0,
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $categoryId = DB::table('categories')->insertGetId([
            'business_id' => $businessId,
            'name' => 'Bebidas',
            'color' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $itemWithCategoryId = DB::table('items')->insertGetId([
            'business_id' => $businessId,
            'category_id' => $categoryId,
            'type' => 'product',
            'name' => 'Agua',
            'price' => 10,
            'active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $itemWithoutCategoryId = DB::table('items')->insertGetId([
            'business_id' => $businessId,
            'category_id' => null,
            'type' => 'product',
            'name' => 'Snack',
            'price' => 5,
            'active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $closedSameDaySaleId = DB::table('sales')->insertGetId([
            'business_id' => $businessId,
            'cash_register_session_id' => $sessionId,
            'user_id' => $user->id,
            'status' => 'closed',
            'total_amount' => 20.50,
            'closed_at' => '2024-01-15 11:00:00',
            'created_at' => '2024-01-15 10:00:00',
            'updated_at' => now(),
        ]);

        $voidedSameDaySaleId = DB::table('sales')->insertGetId([
            'business_id' => $businessId,
            'cash_register_session_id' => $sessionId,
            'user_id' => $user->id,
            'status' => 'voided',
            'total_amount' => 5.00,
            'voided_at' => '2024-01-15 13:00:00',
            'created_at' => '2024-01-15 12:00:00',
            'updated_at' => now(),
        ]);

        $closedAnotherDaySaleId = DB::table('sales')->insertGetId([
            'business_id' => $businessId,
            'cash_register_session_id' => $sessionId,
            'user_id' => $user->id,
            'status' => 'closed',
            'total_amount' => 10.00,
            'closed_at' => '2024-01-16 10:00:00',
            'created_at' => '2024-01-16 09:00:00',
            'updated_at' => now(),
        ]);

        DB::table('sale_items')->insert([
            [
                'sale_id' => $closedSameDaySaleId,
                'item_id' => $itemWithCategoryId,
                'item_name_snapshot' => 'Agua',
                'unit_price_snapshot' => 10.25,
                'quantity' => 2,
                'total' => 20.50,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'sale_id' => $closedAnotherDaySaleId,
                'item_id' => $itemWithoutCategoryId,
                'item_name_snapshot' => 'Snack',
                'unit_price_snapshot' => 10.00,
                'quantity' => 1,
                'total' => 10.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'sale_id' => $voidedSameDaySaleId,
                'item_id' => $itemWithCategoryId,
                'item_name_snapshot' => 'Agua',
                'unit_price_snapshot' => 5.00,
                'quantity' => 1,
                'total' => 5.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        DB::table('sale_payments')->insert([
            [
                'sale_id' => $closedSameDaySaleId,
                'payment_method_id' => 1,
                'amount' => 20.50,
                'status' => 'confirmed',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'sale_id' => $closedAnotherDaySaleId,
                'payment_method_id' => 2,
                'amount' => 15.00,
                'status' => 'confirmed',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'sale_id' => $closedAnotherDaySaleId,
                'payment_method_id' => 1,
                'amount' => 10.00,
                'status' => 'confirmed',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'sale_id' => $voidedSameDaySaleId,
                'payment_method_id' => 1,
                'amount' => 5.00,
                'status' => 'confirmed',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        return [$token, $businessId];
    }
}
