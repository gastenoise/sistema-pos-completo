<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\SalePayment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SaleCloseVoidContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_close_sale_contract_for_confirmed_payments(): void
    {
        [$token, $businessId, $saleId] = $this->seedOpenSaleWithConfirmedPayments();

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $businessId)
            ->postJson("/protected/sales/{$saleId}/close");

        $response
            ->assertOk()
            ->assertJsonStructure(['success', 'message'])
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Sale finalized');
    }

    public function test_void_sale_contract(): void
    {
        [$token, $businessId, $saleId] = $this->seedClosedSale();

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $businessId)
            ->postJson("/protected/sales/{$saleId}/void", [
                'reason' => 'Error de carga',
            ]);

        $response
            ->assertOk()
            ->assertJsonStructure(['success', 'message'])
            ->assertJsonPath('success', true);
    }

    private function seedOpenSaleWithConfirmedPayments(): array
    {
        $user = User::factory()->create();
        $token = $user->createToken('sale-close')->plainTextToken;

        $business = Business::create(['name' => 'Ventas', 'currency' => 'ARS']);
        DB::table('business_users')->insert([
            'user_id' => $user->id,
            'business_id' => $business->id,
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $sessionId = DB::table('cash_register_sessions')->insertGetId([
            'business_id' => $business->id,
            'opened_by' => $user->id,
            'opened_at' => now()->subHour(),
            'opening_cash_amount' => 0,
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $itemId = DB::table('items')->insertGetId([
            'business_id' => $business->id,
            'name' => 'Producto demo',
            'price' => 1200,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $saleId = DB::table('sales')->insertGetId([
            'business_id' => $business->id,
            'cash_register_session_id' => $sessionId,
            'user_id' => $user->id,
            'status' => 'open',
            'total_amount' => 1200,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('sale_items')->insert([
            'sale_id' => $saleId,
            'item_id' => $itemId,
            'item_source' => 'local',
            'item_name_snapshot' => 'Producto demo',
            'barcode_snapshot' => null,
            'unit_price_snapshot' => 1200,
            'category_id_snapshot' => null,
            'category_name_snapshot' => null,
            'quantity' => 1,
            'total' => 1200,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $cashMethodId = DB::table('payment_methods')->insertGetId([
            'code' => 'cash',
            'name' => 'Efectivo',
            'icon' => 1,
            'color' => '#fff',
        ]);

        SalePayment::create([
            'sale_id' => $saleId,
            'payment_method_id' => $cashMethodId,
            'amount' => 1200,
            'status' => SalePayment::STATUS_CONFIRMED,
        ]);

        return [$token, $business->id, $saleId];
    }

    private function seedClosedSale(): array
    {
        [$token, $businessId, $saleId] = $this->seedOpenSaleWithConfirmedPayments();

        DB::table('sales')->where('id', $saleId)->update([
            'status' => 'closed',
            'closed_at' => now()->subMinute(),
        ]);

        return [$token, $businessId, $saleId];
    }
}
