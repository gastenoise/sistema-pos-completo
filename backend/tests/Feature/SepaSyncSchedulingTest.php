<?php

namespace Tests\Feature;

use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use ReflectionProperty;
use Tests\TestCase;

class SepaSyncSchedulingTest extends TestCase
{
    public function test_it_registers_sepa_bootstrap_and_advance_in_scheduler(): void
    {
        $events = collect(app(Schedule::class)->events());

        $this->assertNotNull($events->first(fn ($event) => str_contains((string) $event->command, 'sepa:sync')), 'No se encontró la tarea sepa:sync en el scheduler.');
        $this->assertNotNull($events->first(fn ($event) => str_contains((string) $event->command, 'sepa:advance')), 'No se encontró la tarea sepa:advance en el scheduler.');
    }

    public function test_it_runs_sepa_bootstrap_daily_at_1530_argentina_timezone(): void
    {
        $event = collect(app(Schedule::class)->events())
            ->first(fn ($event) => str_contains((string) $event->command, 'sepa:sync'));

        $this->assertNotNull($event, 'No se encontró la tarea sepa:sync en el scheduler.');
        $this->assertSame('30 15 * * *', $event->expression);
        $this->assertSame('America/Argentina/Buenos_Aires', $event->timezone);
    }

    public function test_it_runs_sepa_advance_every_fifteen_minutes_during_operating_hours(): void
    {
        $event = collect(app(Schedule::class)->events())
            ->first(fn ($event) => str_contains((string) $event->command, 'sepa:advance'));

        $this->assertNotNull($event, 'No se encontró la tarea sepa:advance en el scheduler.');
        $this->assertSame('* * * * *', $event->expression);
        $this->assertSame('America/Argentina/Buenos_Aires', $event->timezone);
        $this->assertNotEmpty($this->schedulerFilters($event), 'La tarea sepa:advance debe restringirse al horario operativo.');
    }

    public function test_it_applies_scheduler_mutex_to_sepa_tasks(): void
    {
        $events = collect(app(Schedule::class)->events())
            ->filter(fn ($event) => str_contains((string) $event->command, 'sepa:sync') || str_contains((string) $event->command, 'sepa:advance'));

        $this->assertCount(2, $events);

        foreach ($events as $event) {
            $this->assertTrue($event->withoutOverlapping, 'La tarea debe usar withoutOverlapping().');
            $this->assertTrue($event->onOneServer, 'La tarea debe usar onOneServer().');
            $this->assertFalse($event->runInBackground, 'La tarea no debe usar runInBackground() para preservar trazabilidad.');
        }
    }

    /**
     * @return array<int, callable>
     */
    private function schedulerFilters(Event $event): array
    {
        $property = new ReflectionProperty($event, 'filters');
        $property->setAccessible(true);

        return $property->getValue($event);
    }
}
