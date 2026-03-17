<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    /**
     * Test the health check endpoint returns JSON.
     */
    public function test_health_check_returns_json(): void
    {
        $response = $this->getJson('/health');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'timestamp',
                'environment',
                'versions' => [
                    'php',
                    'laravel',
                ],
                'checks' => [
                    'database',
                    'cache',
                ],
            ])
            ->assertJson([
                'status' => 'ok',
            ]);
    }

    /**
     * Test the health check endpoint returns HTML.
     */
    public function test_health_check_returns_html(): void
    {
        $response = $this->get('/health');

        $response->assertStatus(200)
            ->assertSee('System Health')
            ->assertSee('Environment')
            ->assertSee('PHP Version')
            ->assertSee('Laravel')
            ->assertSee('Database')
            ->assertSee('Cache');
    }
}
