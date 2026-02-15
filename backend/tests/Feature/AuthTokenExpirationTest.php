<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AuthTokenExpirationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_uses_cookie_session_and_revokes_legacy_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => 'secret123',
        ]);

        $user->createToken('legacy-front', ['front']);

        $response = $this->postJson('/protected/auth/login', [
            'email' => $user->email,
            'password' => 'secret123',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.session_idle_minutes', (int) config('session.lifetime'));

        $cookieNames = collect($response->headers->getCookies())->map->getName();

        $this->assertTrue($cookieNames->contains(config('session.cookie')));
        $this->assertTrue($cookieNames->contains('XSRF-TOKEN'));
        $this->assertSame(0, PersonalAccessToken::where('tokenable_id', $user->id)->count());
    }

    public function test_logout_invalidates_the_current_session(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web');

        $response = $this->postJson('/protected/auth/logout');

        $response->assertOk()->assertJsonPath('success', true);
        $this->assertGuest('web');
    }
}
