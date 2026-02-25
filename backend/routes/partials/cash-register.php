<?php

use App\Http\Controllers\CashRegisterController;
use Illuminate\Support\Facades\Route;

if (! function_exists('registerCashRegisterRoutes')) {
    /**
     * @param  array{middleware?: string|array<int,string>, includeProtectedOnly?: bool}  $context
     */
    function registerCashRegisterRoutes(array $context = []): void
    {
        $middleware = $context['middleware'] ?? [];
        $includeProtectedOnly = (bool) ($context['includeProtectedOnly'] ?? false);

        Route::middleware($middleware)->prefix('cash-register')->group(function () use ($includeProtectedOnly) {
            Route::get('status', [CashRegisterController::class, 'status']);
            Route::post('open', [CashRegisterController::class, 'open']);
            Route::post('close', [CashRegisterController::class, 'close']);

            if ($includeProtectedOnly) {
                Route::get('sessions/closed', [CashRegisterController::class, 'closedSessions']);
            }

            Route::get('{session}/expected-totals', [CashRegisterController::class, 'getExpectedTotals']);
        });
    }
}
