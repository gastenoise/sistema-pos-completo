<?php

use App\Jobs\FetchDollarRate;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new FetchDollarRate)->dailyAt('09:00');

Schedule::command('sepa:sync')
    ->dailyAt('15:30')
    ->timezone('America/Argentina/Buenos_Aires')
    ->withoutOverlapping()
    ->onOneServer();

Schedule::command('sepa:advance')
    ->everyFifteenMinutes()
    ->between('15:30', '23:59')
    ->timezone('America/Argentina/Buenos_Aires')
    ->withoutOverlapping()
    ->onOneServer();
