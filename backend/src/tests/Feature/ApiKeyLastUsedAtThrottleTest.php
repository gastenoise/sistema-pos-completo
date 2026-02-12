<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\Business;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ApiKeyLastUsedAtThrottleTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_throttles_last_used_at_writes_across_multiple_requests(): void
    {
        config()->set('services.api_keys.last_used_at_throttle_minutes', 10);

        $user = User::factory()->create();
        $business = Business::query()->create([
            'name' => 'Negocio API',
            'currency' => 'ARS',
        ]);

        $rawKey = 'test-key-123';
        $apiKey = ApiKey::query()->create([
            'business_id' => $business->id,
            'user_id' => $user->id,
            'name' => 'Integracion',
            'key_hash' => hash('sha256', $rawKey),
            'last_used_at' => null,
        ]);

        Carbon::setTestNow('2025-01-01 10:00:00');

        $this->withHeader('X-Api-Key', $rawKey)
            ->getJson('/public/info/colors')
            ->assertOk();

        $firstUsage = $apiKey->fresh()->last_used_at;
        $this->assertNotNull($firstUsage);
        $this->assertSame('2025-01-01 10:00:00', $firstUsage->format('Y-m-d H:i:s'));

        Carbon::setTestNow('2025-01-01 10:05:00');

        $this->withHeader('X-Api-Key', $rawKey)
            ->getJson('/public/info/colors')
            ->assertOk();

        $secondUsage = $apiKey->fresh()->last_used_at;
        $this->assertSame(
            $firstUsage->format('Y-m-d H:i:s'),
            $secondUsage->format('Y-m-d H:i:s')
        );

        Carbon::setTestNow('2025-01-01 10:11:00');

        $this->withHeader('X-Api-Key', $rawKey)
            ->getJson('/public/info/colors')
            ->assertOk();

        $thirdUsage = $apiKey->fresh()->last_used_at;
        $this->assertSame('2025-01-01 10:11:00', $thirdUsage->format('Y-m-d H:i:s'));

        Carbon::setTestNow();
    }
}
