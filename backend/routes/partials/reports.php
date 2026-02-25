<?php

use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

if (! function_exists('registerReportRoutes')) {
    /**
     * @param  array{middleware?: string|array<int,string>, prefix?: string}  $context
     */
    function registerReportRoutes(array $context = []): void
    {
        $middleware = $context['middleware'] ?? [];
        $prefix = (string) ($context['prefix'] ?? 'reports');

        Route::middleware($middleware)->prefix($prefix)->group(function () {
            Route::get('daily-summary', [ReportController::class, 'dailySummary']);
            Route::get('sales', [ReportController::class, 'salesList']);
            Route::get('summary', [ReportController::class, 'salesSummary']);
            Route::get('export', [ReportController::class, 'export']);
        });
    }
}
