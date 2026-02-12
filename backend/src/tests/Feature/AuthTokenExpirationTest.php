<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AuthTokenExpirationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_creates_front_token_with_one_hour_expiration(): void
    {
        config(['sanctum.frontend_idle_minutes' => 60]);

        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => 'secret123',
        ]);

        Carbon::setTestNow(now());

        $response = $this->postJson('/protected/auth/login', [
            'email' => $user->email,
            'password' => 'secret123',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.session_idle_minutes', 60);

        $token = PersonalAccessToken::where('tokenable_id', $user->id)
            ->where('name', 'front')
            ->latest('id')
            ->first();

        $this->assertNotNull($token);
        $this->assertNotNull($token->expires_at);
        $this->assertEqualsWithDelta(now()->addHour()->timestamp, $token->expires_at->timestamp, 1);

        Carbon::setTestNow();
    }

    public function test_front_token_expiration_is_not_renewed_when_remaining_time_is_above_threshold(): void
    {
        config([
            'sanctum.frontend_idle_minutes' => 60,
            'sanctum.frontend_refresh_threshold_minutes' => 15,
        ]);

        $issuedAt = now();
        Carbon::setTestNow($issuedAt);

        $user = User::factory()->create();
        $plainTextToken = $user->createToken('front', ['front'], now()->addMinutes(40))->plainTextToken;

        Carbon::setTestNow($issuedAt->copy()->addMinutes(5));

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$plainTextToken)
            ->getJson('/protected/auth/me');

        $response->assertOk();

        $accessToken = PersonalAccessToken::findToken($plainTextToken);

        $this->assertNotNull($accessToken);
        $this->assertNotNull($accessToken->expires_at);
        $this->assertEqualsWithDelta($issuedAt->copy()->addMinutes(40)->timestamp, $accessToken->expires_at->timestamp, 1);

        Carbon::setTestNow();
    }

    public function test_front_token_expiration_is_renewed_when_remaining_time_is_within_threshold(): void
    {
        config([
            'sanctum.frontend_idle_minutes' => 60,
            'sanctum.frontend_refresh_threshold_minutes' => 15,
        ]);

        $issuedAt = now();
        Carbon::setTestNow($issuedAt);

        $user = User::factory()->create();
        $plainTextToken = $user->createToken('front', ['front'], now()->addMinutes(10))->plainTextToken;

        Carbon::setTestNow($issuedAt->copy()->addMinutes(5));

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$plainTextToken)
            ->getJson('/protected/auth/me');

        $response->assertOk();

        $accessToken = PersonalAccessToken::findToken($plainTextToken);

        $this->assertNotNull($accessToken);
        $this->assertNotNull($accessToken->expires_at);
        $this->assertEqualsWithDelta(now()->addMinutes(60)->timestamp, $accessToken->expires_at->timestamp, 1);

        Carbon::setTestNow();
    }

    public function test_expired_front_token_returns_unauthorized_response(): void
    {
        config([
            'sanctum.frontend_idle_minutes' => 60,
            'sanctum.frontend_refresh_threshold_minutes' => 15,
        ]);

        $issuedAt = now();
        Carbon::setTestNow($issuedAt);

        $user = User::factory()->create();
        $plainTextToken = $user->createToken('front', ['front'], now()->addMinutes(5))->plainTextToken;

        Carbon::setTestNow($issuedAt->copy()->addMinutes(6));

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$plainTextToken)
            ->getJson('/protected/auth/me');

        $response->assertStatus(401);

        $message = $response->json('message');
        $this->assertContains($message, [
            'Session expired. Please log in again.',
            'Unauthenticated.',
        ]);

        Carbon::setTestNow();
    }
}
