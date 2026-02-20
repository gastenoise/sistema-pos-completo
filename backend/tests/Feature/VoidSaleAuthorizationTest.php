<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class VoidSaleAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_void_a_closed_sale(): void
    {
        [$token, $businessId, $saleId] = $this->seedSaleWithRole('admin');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $businessId)
            ->postJson("/protected/sales/{$saleId}/void", [
                'reason' => 'Cliente solicitó cancelación',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('sales', [
            'id' => $saleId,
            'status' => 'voided',
        ]);
    }

    public function test_cashier_cannot_void_a_sale_and_receives_spanish_403_message(): void
    {
        [$token, $businessId, $saleId] = $this->seedSaleWithRole('cashier');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $businessId)
            ->postJson("/protected/sales/{$saleId}/void", [
                'reason' => 'Intento manual sin permisos',
            ]);

        $response
            ->assertForbidden()
            ->assertJson([
                'success' => false,
                'message' => 'Solo los administradores pueden anular ventas.',
                'error' => 'forbidden',
            ]);

        $this->assertDatabaseHas('sales', [
            'id' => $saleId,
            'status' => 'closed',
        ]);
    }

    private function seedSaleWithRole(string $role): array
    {
        $user = User::factory()->create();
        $token = $user->createToken('void-sale')->plainTextToken;

        $businessId = DB::table('businesses')->insertGetId([
            'name' => 'Negocio Demo',
            'currency' => 'ARS',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('business_users')->insert([
            'user_id' => $user->id,
            'business_id' => $businessId,
            'role' => $role,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $sessionId = DB::table('cash_register_sessions')->insertGetId([
            'business_id' => $businessId,
            'opened_by' => $user->id,
            'opened_at' => now()->subHour(),
            'opening_cash_amount' => 0,
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $saleId = DB::table('sales')->insertGetId([
            'business_id' => $businessId,
            'cash_register_session_id' => $sessionId,
            'user_id' => $user->id,
            'status' => 'closed',
            'total_amount' => 2500,
            'closed_at' => now()->subMinutes(10),
            'created_at' => now()->subMinutes(20),
            'updated_at' => now(),
        ]);

        return [$token, $businessId, $saleId];
    }
}

