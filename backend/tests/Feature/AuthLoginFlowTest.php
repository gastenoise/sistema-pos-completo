<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthLoginFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_401_on_failed_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => 'secret123',
        ]);

        $response = $this->postJson('/protected/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Credenciales inválidas.');
    }

    public function test_login_returns_success_on_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => 'secret123',
        ]);

        $response = $this->postJson('/protected/auth/login', [
            'email' => 'test@example.com',
            'password' => 'secret123',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['user_name', 'session_idle_minutes']]);

        $this->assertAuthenticatedAs($user, 'web');
    }
}
