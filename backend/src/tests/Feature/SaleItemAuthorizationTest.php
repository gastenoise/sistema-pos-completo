<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\CashRegisterSession;
use App\Models\Item;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SaleItemAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_remove_item_rejects_sale_item_from_another_sale(): void
    {
        $user = User::factory()->create();
        $business = Business::create([
            'name' => 'Negocio Test',
            'currency' => 'ARS',
        ]);

        DB::table('business_users')->insert([
            'user_id' => $user->id,
            'business_id' => $business->id,
            'role' => 'cashier',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $session = CashRegisterSession::create([
            'business_id' => $business->id,
            'opened_by' => $user->id,
            'opened_at' => now(),
            'opening_cash_amount' => 0,
            'status' => 'open',
        ]);

        $item = Item::create([
            'business_id' => $business->id,
            'type' => 'product',
            'name' => 'Producto 1',
            'price' => 100,
            'active' => true,
        ]);

        $saleA = Sale::create([
            'business_id' => $business->id,
            'cash_register_session_id' => $session->id,
            'user_id' => $user->id,
            'status' => 'open',
            'total_amount' => 0,
        ]);

        $saleB = Sale::create([
            'business_id' => $business->id,
            'cash_register_session_id' => $session->id,
            'user_id' => $user->id,
            'status' => 'open',
            'total_amount' => 0,
        ]);

        $saleItemOfSaleB = SaleItem::create([
            'sale_id' => $saleB->id,
            'item_id' => $item->id,
            'item_name_snapshot' => $item->name,
            'unit_price_snapshot' => 100,
            'quantity' => 1,
            'total' => 100,
        ]);

        $token = $user->createToken('front', ['front'])->plainTextToken;

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $business->id)
            ->deleteJson("/protected/sales/{$saleA->id}/items/{$saleItemOfSaleB->id}");

        $response->assertStatus(404);
        $this->assertDatabaseHas('sale_items', ['id' => $saleItemOfSaleB->id]);
    }
}
