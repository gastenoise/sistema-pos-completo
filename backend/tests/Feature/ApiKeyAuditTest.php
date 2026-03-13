<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\Business;
use App\Models\User;
use App\Services\BusinessContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiKeyAuditTest extends TestCase
{
    use RefreshDatabase;

    protected Business $business;
    protected User $user;
    protected string $rawKey;
    protected ApiKey $apiKey;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->business = Business::query()->create([
            'name' => 'Audit Business',
            'currency' => 'ARS',
        ]);

        $this->rawKey = 'audit-test-key-64-characters-long-1234567890-1234567890-1234567890';
        $this->apiKey = ApiKey::query()->create([
            'business_id' => $this->business->id,
            'user_id' => $this->user->id,
            'name' => 'Audit Key',
            'key_hash' => hash('sha256', $this->rawKey),
        ]);
    }

    public function test_it_authenticates_with_x_api_key_header(): void
    {
        $this->withHeader('X-Api-Key', $this->rawKey)
            ->getJson('/public/info/colors')
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->assertEquals($this->business->id, app(BusinessContext::class)->getBusinessId());
    }

    public function test_it_authenticates_with_authorization_apikey_header(): void
    {
        $this->withHeader('Authorization', 'ApiKey ' . $this->rawKey)
            ->getJson('/public/info/colors')
            ->assertOk()
            ->assertJson(['success' => true]);
    }

    public function test_it_authenticates_with_case_insensitive_apikey_prefix(): void
    {
        $this->withHeader('Authorization', 'apikey ' . $this->rawKey)
            ->getJson('/public/info/colors')
            ->assertOk();

        $this->withHeader('Authorization', 'APIKEY ' . $this->rawKey)
            ->getJson('/public/info/colors')
            ->assertOk();
    }

    public function test_it_handles_multiple_spaces_in_authorization_header(): void
    {
        $this->withHeader('Authorization', 'ApiKey    ' . $this->rawKey)
            ->getJson('/public/info/colors')
            ->assertOk();
    }

    public function test_it_fails_with_invalid_key(): void
    {
        $this->withHeader('X-Api-Key', 'invalid-key')
            ->getJson('/public/info/colors')
            ->assertStatus(401)
            ->assertJson(['success' => false, 'message' => 'Invalid API key']);
    }

    public function test_it_fails_with_revoked_key(): void
    {
        $this->apiKey->update(['revoked_at' => now()]);

        $this->withHeader('X-Api-Key', $this->rawKey)
            ->getJson('/public/info/colors')
            ->assertStatus(401)
            ->assertJson(['success' => false, 'message' => 'Invalid API key']);
    }

    public function test_it_fails_with_expired_key(): void
    {
        $this->apiKey->update(['expires_at' => now()->subDay()]);

        $this->withHeader('X-Api-Key', $this->rawKey)
            ->getJson('/public/info/colors')
            ->assertStatus(401)
            ->assertJson(['success' => false, 'message' => 'Invalid API key']);
    }

    public function test_it_fails_with_missing_key(): void
    {
        $this->getJson('/public/info/colors')
            ->assertStatus(401)
            ->assertJson(['success' => false, 'message' => 'API key required']);
    }

    public function test_it_fails_with_empty_key(): void
    {
        $this->withHeader('X-Api-Key', '')
            ->getJson('/public/info/colors')
            ->assertStatus(401);

        $this->withHeader('Authorization', 'ApiKey ')
            ->getJson('/public/info/colors')
            ->assertStatus(401);
    }
}
