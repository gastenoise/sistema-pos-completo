<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class SystemSchedulerManualRunTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Config::set('services.system.cron_token', 'test-token');
    }

    public function test_it_fails_without_token(): void
    {
        $response = $this->postJson('/protected/system/run-scheduler');

        $response->assertStatus(401);
    }

    public function test_it_fails_with_wrong_token(): void
    {
        $response = $this->postJson('/protected/system/run-scheduler', [], [
            'X-Cron-Token' => 'wrong-token'
        ]);

        $response->assertStatus(401);
    }

    public function test_it_runs_scheduler_with_correct_token(): void
    {
        // No podemos probar fácilmente la ejecución real del scheduler sin disparar tareas reales,
        // pero podemos verificar que el controlador responde correctamente si el token es válido.
        // Artisan::call es capturado por el framework en tests si se desea, pero aquí verificamos el flujo.

        $response = $this->postJson('/protected/system/run-scheduler', [], [
            'X-Cron-Token' => 'test-token'
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Scheduler ejecutado.'
        ]);
    }
}
