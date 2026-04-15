<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class SystemSchedulerManualRunTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('services.system.cron_token', 'test-token');
    }

    public function test_it_fails_without_token(): void
    {
        $response = $this->postJson('/system/run-scheduler');

        $response->assertStatus(401);
    }

    public function test_it_fails_with_wrong_token(): void
    {
        $response = $this->postJson('/system/run-scheduler', [], [
            'X-Cron-Token' => 'wrong-token'
        ]);

        $response->assertStatus(401);
    }

    public function test_it_runs_scheduler_with_correct_token(): void
    {
        $response = $this->postJson('/system/run-scheduler', [], [
            'X-Cron-Token' => 'test-token'
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Scheduler ejecutado.'
        ]);
    }

    public function test_it_runs_manual_sepa_sync_with_requested_date_for_auditing_only(): void
    {
        Artisan::shouldReceive('call')
            ->once()
            ->with('sepa:sync', [
                '--sync' => true,
                '--requested-date' => '2026-04-07',
            ]);
        Artisan::shouldReceive('output')->once()->andReturn('ok');

        $response = $this->postJson('/system/sepa-sync', [
            'requested_date' => '2026-04-07',
        ], [
            'X-Cron-Token' => 'test-token',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('requested_date', '2026-04-07');
        $response->assertJsonPath('message', 'Sincronización SEPA ejecutada. requested_date se registra solo para auditoría y no cambia el dataset importado.');
    }
}
