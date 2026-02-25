<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CashRegisterContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_cash_register_status_contract_for_open_session(): void
    {
        [$token, $businessId, $userId] = $this->authContext();

        DB::table('cash_register_sessions')->insert([
            'business_id' => $businessId,
            'opened_by' => $userId,
            'opened_at' => now()->subMinutes(30),
            'opening_cash_amount' => 500,
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $businessId)
            ->getJson('/protected/cash-register/status');

        $response
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'is_open',
                    'session',
                ],
            ])
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.session.status', 'open');
    }

    public function test_cash_register_open_contract(): void
    {
        [$token, $businessId] = $this->authContext();

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->withHeader('X-Business-Id', (string) $businessId)
            ->postJson('/protected/cash-register/open', [
                'amount' => 1500,
                'notes' => 'Turno mañana',
            ]);

        $response
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'business_id',
                    'opening_cash_amount',
                    'status',
                ],
            ])
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'open');
    }

    private function authContext(): array
    {
        $user = User::factory()->create();
        $token = $user->createToken('cash-contract')->plainTextToken;

        $business = Business::create([
            'name' => 'Caja Central',
            'currency' => 'ARS',
        ]);

        DB::table('business_users')->insert([
            'user_id' => $user->id,
            'business_id' => $business->id,
            'role' => 'owner',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$token, $business->id, $user->id];
    }
}
