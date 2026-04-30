<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MercadoPagoRestrictionTest extends TestCase
{
    use RefreshDatabase;

    protected $business;
    protected $user;
    protected $mpMethod;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->business = Business::create([
            'name' => 'Test Business',
            'email' => 'test@business.com',
        ]);
        $this->user->businesses()->attach($this->business->id, ['role' => 'owner']);

        $this->mpMethod = PaymentMethod::create([
            'code' => 'mercado_pago',
            'name' => 'Mercado Pago',
            'icon' => 'qr_code',
            'color' => '#009EE3',
        ]);

        PaymentMethod::create([
            'code' => 'cash',
            'name' => 'Efectivo',
            'icon' => 'banknote',
            'color' => '#10B981',
        ]);
    }

    public function test_payment_methods_list_marks_mp_as_disabled_when_globally_disabled()
    {
        config(['mercadopago.enabled' => false]);

        $response = $this->actingAs($this->user)
            ->withHeader('X-Business-Id', $this->business->id)
            ->getJson('/protected/payment-methods');

        $response->assertStatus(200);
        $methods = $response->json();

        $mp = collect($methods)->firstWhere('code', 'mercado_pago');
        $this->assertFalse($mp['enabled']);
    }

    public function test_cannot_activate_mp_when_globally_disabled()
    {
        config(['mercadopago.enabled' => false]);

        $response = $this->actingAs($this->user)
            ->withHeader('X-Business-Id', $this->business->id)
            ->putJson("/protected/payment-methods/{$this->mpMethod->id}", [
                'active' => true
            ]);

        $response->assertStatus(422);
        $response->assertJsonPath('code', 'MERCADO_PAGO_DISABLED');
    }

    public function test_cannot_bulk_activate_mp_when_globally_disabled()
    {
        config(['mercadopago.enabled' => false]);

        $response = $this->actingAs($this->user)
            ->withHeader('X-Business-Id', $this->business->id)
            ->postJson("/protected/payment-methods", [
                'methods' => [
                    (string)$this->mpMethod->id => true
                ]
            ]);

        $response->assertStatus(422);
        $response->assertJsonPath('code', 'MERCADO_PAGO_DISABLED');
    }

    public function test_cannot_use_mp_in_sale_when_globally_disabled()
    {
        config(['mercadopago.enabled' => false]);

        $session = \App\Models\CashRegisterSession::create([
            'business_id' => $this->business->id,
            'opened_by' => $this->user->id,
            'opened_at' => now(),
            'opening_cash_amount' => 1000,
            'status' => 'open',
        ]);

        $sale = \App\Models\Sale::create([
            'business_id' => $this->business->id,
            'cash_register_session_id' => $session->id,
            'user_id' => $this->user->id,
            'status' => 'open',
            'total_amount' => 100,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeader('X-Business-Id', $this->business->id)
            ->postJson("/protected/sales/{$sale->id}/payments/bulk", [
                'payments' => [
                    [
                        'payment_method_id' => $this->mpMethod->id,
                        'amount' => 100
                    ]
                ]
            ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'Mercado Pago is currently disabled');
    }

    public function test_can_activate_mp_when_globally_enabled()
    {
        config(['mercadopago.enabled' => true]);

        $response = $this->actingAs($this->user)
            ->withHeader('X-Business-Id', $this->business->id)
            ->putJson("/protected/payment-methods/{$this->mpMethod->id}", [
                'active' => true
            ]);

        $response->assertStatus(200);
        $this->assertTrue($response->json('active'));
    }
}
