<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessUser;
use App\Models\CashRegisterSession;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SaleTicketPdfDownloadTest extends TestCase
{
    use RefreshDatabase;

    public function test_ticket_pdf_download_returns_pdf_and_creates_runtime_directories(): void
    {
        $user = User::factory()->create();

        $business = Business::create([
            'name' => 'Negocio Demo',
            'address' => 'Calle 123',
            'phone' => '123456789',
            'email' => 'demo@example.com',
        ]);

        BusinessUser::create([
            'user_id' => $user->id,
            'business_id' => $business->id,
            'role' => 'owner',
        ]);

        DB::table('payment_methods')->insert([
            'code' => 'cash',
            'name' => 'Efectivo',
            'color' => 1,
            'icon' => null,
        ]);

        $paymentMethod = PaymentMethod::where('code', 'cash')->firstOrFail();

        $session = CashRegisterSession::create([
            'business_id' => $business->id,
            'opened_by' => $user->id,
            'opened_at' => now()->subHour(),
            'opening_cash_amount' => 1000,
            'status' => 'open',
        ]);

        $sale = Sale::create([
            'business_id' => $business->id,
            'cash_register_session_id' => $session->id,
            'user_id' => $user->id,
            'status' => 'closed',
            'total_amount' => 2000,
            'closed_at' => now(),
        ]);

        SaleItem::create([
            'sale_id' => $sale->id,
            'item_name_snapshot' => 'Producto Demo',
            'unit_price_snapshot' => 2000,
            'quantity' => 1,
            'total' => 2000,
        ]);

        SalePayment::create([
            'sale_id' => $sale->id,
            'payment_method_id' => $paymentMethod->id,
            'amount' => 2000,
            'status' => 'confirmed',
            'confirmed_at' => now(),
            'confirmed_by' => $user->id,
        ]);

        $plainTextToken = $user->createToken('front', ['front'], now()->addHour())->plainTextToken;

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$plainTextToken)
            ->withHeader('X-Business-Id', (string) $business->id)
            ->get("/protected/sales/{$sale->id}/ticket/pdf?download=true");

        $response
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->assertHeader('content-disposition', "attachment; filename=\"ticket-venta-{$sale->id}.pdf\"");

        $this->assertDirectoryExists(storage_path('app/dompdf/tmp'));
        $this->assertDirectoryExists(storage_path('app/dompdf/font'));
        $this->assertDirectoryExists(storage_path('app/dompdf/font-cache'));
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }
}
