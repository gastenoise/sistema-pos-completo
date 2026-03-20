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

    public function test_it_starts_sepa_run_asynchronously_by_default(): void
    {
        Artisan::shouldReceive('call')->once()->with('sepa:sync', [])->andReturn(0);
        Artisan::shouldReceive('output')->once()->andReturn("bootstrap queued\n");

        $response = $this->postJson('/system/sepa-sync', [], [
            'X-Cron-Token' => 'test-token'
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Corrida SEPA iniciada.',
        ]);
    }

    public function test_it_can_advance_a_single_sepa_stage_manually(): void
    {
        Artisan::shouldReceive('call')->once()->with('sepa:advance', [])->andReturn(0);
        Artisan::shouldReceive('output')->once()->andReturn("advanced\n");

        $response = $this->postJson('/system/sepa-sync', ['action' => 'advance'], [
            'X-Cron-Token' => 'test-token'
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Corrida SEPA avanzada una etapa.',
        ]);
    }

    public function test_it_rejects_unknown_sepa_action(): void
    {
        $response = $this->postJson('/system/sepa-sync', ['action' => 'foo'], [
            'X-Cron-Token' => 'test-token'
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'message' => 'Acción SEPA inválida. Use start, advance o diagnostic.',
        ]);
    }
}
