<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SanctumCsrfSessionLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_with_csrf_cookie_authenticates_session_and_accesses_me_endpoint(): void
    {
        $password = 'Password!123';
        $user = User::factory()->create([
            'password' => bcrypt($password),
        ]);

        $csrfResponse = $this->get('/sanctum/csrf-cookie');

        $csrfResponse->assertNoContent();

        $xsrfCookie = $csrfResponse->getCookie('XSRF-TOKEN');
        $sessionCookie = $csrfResponse->getCookie(config('session.cookie'));

        $this->assertNotNull($xsrfCookie, 'Missing XSRF-TOKEN cookie from /sanctum/csrf-cookie response.');
        $this->assertNotNull($sessionCookie, 'Missing session cookie from /sanctum/csrf-cookie response.');

        $xsrfToken = urldecode((string) $xsrfCookie?->getValue());

        $loginResponse = $this
            ->withHeader('X-XSRF-TOKEN', $xsrfToken)
            ->withCookie('XSRF-TOKEN', (string) $xsrfCookie?->getValue())
            ->withCookie(config('session.cookie'), (string) $sessionCookie?->getValue())
            ->postJson('/protected/auth/login', [
                'email' => $user->email,
                'password' => $password,
            ]);

        $loginResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertDontSeeText('CSRF token mismatch');

        $authenticatedSessionCookie = $loginResponse->getCookie(config('session.cookie')) ?? $sessionCookie;

        $meResponse = $this
            ->withCookie(config('session.cookie'), (string) $authenticatedSessionCookie?->getValue())
            ->getJson('/protected/auth/me');

        $meResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', $user->email)
            ->assertDontSeeText('CSRF token mismatch');
    }
}
