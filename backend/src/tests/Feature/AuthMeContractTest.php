<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthMeContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_auth_me_returns_the_expected_user_contract(): void
    {
        $user = User::factory()->create([
            'name' => 'Contract User',
            'email' => 'contract@example.com',
            'phone' => '+5491112345678',
        ]);

        $token = $user->createToken('front')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/protected/auth/me');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'user' => [
                        'name',
                        'email',
                        'phone',
                        'created_at',
                        'updated_at',
                    ],
                ],
            ])
            ->assertJsonMissingPath('data.user.id')
            ->assertJsonMissingPath('data.user.password')
            ->assertJsonMissingPath('data.user.remember_token');
    }
}
