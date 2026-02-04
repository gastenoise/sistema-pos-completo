<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use App\Models\DollarRate;

class FetchDollarRate implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        // Mock URL or env URL
        $url = config('services.dollar.url', 'https://api.mock.com/dollar');
        
        // Simulación
        $rate = 1000.50; // Logic with Http::get($url) here
        
        DollarRate::create([
            'date' => now(),
            'rate' => $rate,
            'source' => 'official_api'
        ]);
    }
}