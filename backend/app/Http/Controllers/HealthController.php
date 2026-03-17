<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class HealthController extends Controller
{
    /**
     * Check the health status of the application.
     */
    public function __invoke(Request $request)
    {
        $status = [
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
            'environment' => config('app.env'),
            'versions' => [
                'php' => PHP_VERSION,
                'laravel' => app()->version(),
            ],
            'checks' => [
                'database' => $this->checkDatabase(),
                'cache' => $this->checkCache(),
            ],
        ];

        if ($status['checks']['database'] !== 'up' || $status['checks']['cache'] !== 'up') {
            $status['status'] = 'unhealthy';
        }

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json($status, $status['status'] === 'ok' ? 200 : 503);
        }

        return view('health', $status);
    }

    /**
     * Check database connectivity.
     */
    private function checkDatabase(): string
    {
        try {
            DB::connection()->getPdo();
            return 'up';
        } catch (\Exception $e) {
            Log::error('Health Check - Database Down: ' . $e->getMessage());
            return 'down';
        }
    }

    /**
     * Check cache connectivity.
     */
    private function checkCache(): string
    {
        try {
            Cache::driver()->get('health-check');
            return 'up';
        } catch (\Exception $e) {
            Log::error('Health Check - Cache Down: ' . $e->getMessage());
            return 'down';
        }
    }
}
