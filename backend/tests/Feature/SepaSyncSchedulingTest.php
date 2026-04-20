<?php

namespace Tests\Feature;

use Illuminate\Console\Scheduling\Schedule;
use Tests\TestCase;

class SepaSyncSchedulingTest extends TestCase
{
    public function test_it_does_not_register_sepa_sync_in_scheduler_anymore(): void
    {
        $event = collect(app(Schedule::class)->events())
            ->first(fn ($event) => str_contains((string) $event->command, 'sepa:sync'));

        $this->assertNull($event, 'La tarea sepa:sync no debe estar registrada en el scheduler.');
    }
}
