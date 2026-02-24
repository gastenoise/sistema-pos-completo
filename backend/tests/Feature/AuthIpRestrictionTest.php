<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthIpRestrictionTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_is_blocked_when_request_ip_does_not_match_allowed_ip(): void
    {
        $user = User::factory()->create([
            'email' => 'ip-locked@example.com',
            'password' => 'secret123',
            'allowed_login_ip' => '203.0.113.10',
        ]);

        $response = $this->withServerVariables([
            'REMOTE_ADDR' => '203.0.113.11',
        ])->postJson('/protected/auth/login', [
            'email' => $user->email,
            'password' => 'secret123',
        ]);

        $response->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', 'auth.ip_not_allowed');
        $this->assertGuest('web');
    }

    public function test_login_succeeds_when_request_ip_matches_allowed_ip(): void
    {
        $user = User::factory()->create([
            'email' => 'ip-ok@example.com',
            'password' => 'secret123',
            'allowed_login_ip' => '203.0.113.10',
        ]);

        $response = $this->withServerVariables([
            'REMOTE_ADDR' => '203.0.113.10',
        ])->postJson('/protected/auth/login', [
            'email' => $user->email,
            'password' => 'secret123',
        ]);

        $response->assertOk()->assertJsonPath('success', true);
    }

    public function test_update_me_allows_setting_and_clearing_allowed_login_ip(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web');

        $setResponse = $this->putJson('/protected/auth/me', [
            'allowed_login_ip' => ' 2001:db8::1 ',
        ]);

        $setResponse->assertOk()->assertJsonPath('data.user.allowed_login_ip', '2001:db8::1');

        $clearResponse = $this->putJson('/protected/auth/me', [
            'allowed_login_ip' => null,
        ]);

        $clearResponse->assertOk()->assertJsonPath('data.user.allowed_login_ip', null);
    }

    public function test_update_me_rejects_invalid_allowed_login_ip(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web');

        $response = $this->putJson('/protected/auth/me', [
            'allowed_login_ip' => 'not-an-ip',
        ]);

        $response->assertUnprocessable();
    }
}
