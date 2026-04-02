<?php

namespace Tests\Feature;

use Illuminate\Console\Scheduling\Schedule;
use Tests\TestCase;

class SepaSyncSchedulingTest extends TestCase
{
    public function test_it_registers_sepa_sync_in_scheduler(): void
    {
        $event = collect(app(Schedule::class)->events())
            ->first(fn ($event) => str_contains((string) $event->command, 'sepa:sync'));

        $this->assertNotNull($event, 'No se encontró la tarea sepa:sync en el scheduler.');
    }

    public function test_it_runs_sepa_sync_at_1530_argentina_timezone(): void
    {
        $event = collect(app(Schedule::class)->events())
            ->first(fn ($event) => str_contains((string) $event->command, 'sepa:sync'));

        $this->assertNotNull($event, 'No se encontró la tarea sepa:sync en el scheduler.');
        $this->assertSame('30 15 * * *', $event->expression);
        $this->assertSame('America/Argentina/Buenos_Aires', $event->timezone);
    }
}
