<?php

use App\Jobs\FetchDollarRate;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new FetchDollarRate)->dailyAt('09:00');
Schedule::command('sepa:sync')->dailyAt('04:00');
