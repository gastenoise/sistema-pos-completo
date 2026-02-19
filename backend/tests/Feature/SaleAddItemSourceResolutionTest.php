<?php

namespace Tests\Feature;

use App\Actions\Sales\AddItemToSaleAction;
use App\Models\Business;
use App\Models\CashRegisterSession;
use App\Models\Category;
use App\Models\Sale;
use App\Models\SepaItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SaleAddItemSourceResolutionTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_adds_sepa_item_and_persists_traceability_snapshot(): void
    {
        $user = User::factory()->create();
        $business = Business::create([
            'name' => 'Negocio Test',
            'currency' => 'ARS',
        ]);

        $session = CashRegisterSession::create([
            'business_id' => $business->id,
            'opened_by' => $user->id,
            'opened_at' => now(),
            'opening_cash_amount' => 0,
            'status' => 'open',
        ]);

        $sale = Sale::create([
            'business_id' => $business->id,
            'cash_register_session_id' => $session->id,
            'user_id' => $user->id,
            'status' => 'open',
            'total_amount' => 0,
        ]);

        $sepaItem = SepaItem::create([
            'name' => 'Yerba SEPA',
            'barcode' => '7791111111111',
            'price' => 1000,
            'presentation_quantity' => 1,
            'presentation_unit' => 'kg',
            'brand' => 'Marca',
            'list_price' => 1200,
        ]);

        $category = Category::create([
            'business_id' => $business->id,
            'name' => 'Yerbas',
            'color' => 1,
        ]);

        DB::table('sepa_item_business_prices')->insert([
            'business_id' => $business->id,
            'sepa_item_id' => $sepaItem->id,
            'price' => 850,
            'category_id' => $category->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        /** @var AddItemToSaleAction $action */
        $action = app(AddItemToSaleAction::class);
        $action->execute($sale, [
            'item_source' => 'sepa',
            'sepa_item_id' => $sepaItem->id,
            'quantity' => 2,
        ]);

        $this->assertDatabaseHas('sale_items', [
            'sale_id' => $sale->id,
            'item_source' => 'sepa',
            'item_id' => null,
            'sepa_item_id' => $sepaItem->id,
            'item_name_snapshot' => 'Yerba SEPA',
            'barcode_snapshot' => '7791111111111',
            'unit_price_snapshot' => 850,
            'category_id_snapshot' => $category->id,
            'category_name_snapshot' => 'Yerbas',
            'quantity' => 2,
            'total' => 1700,
        ]);
    }
}
