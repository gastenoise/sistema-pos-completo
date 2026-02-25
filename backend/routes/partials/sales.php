<?php

use App\Http\Controllers\SaleController;
use App\Http\Controllers\SalePaymentController;
use App\Http\Controllers\SaleTicketController;
use Illuminate\Support\Facades\Route;

if (! function_exists('registerSalesRoutes')) {
    /**
     * @param  array{middleware?: string|array<int,string>, includeProtectedOnly?: bool}  $context
     */
    function registerSalesRoutes(array $context = []): void
    {
        $middleware = $context['middleware'] ?? [];
        $includeProtectedOnly = (bool) ($context['includeProtectedOnly'] ?? false);

        Route::middleware($middleware)->prefix('sales')->scopeBindings()->group(function () use ($includeProtectedOnly) {
            Route::post('/', [SaleController::class, 'store']);
            Route::post('start', [SaleController::class, 'start']);
            Route::get('latest-closed', [SaleController::class, 'latestClosed']);
            Route::get('{sale}', [SaleController::class, 'show']);
            Route::post('{sale}/items', [SaleController::class, 'addItem']);
            Route::delete('{sale}/items/{saleItem}', [SaleController::class, 'removeItem'])->middleware('can:update,sale');
            Route::post('{sale}/payments/bulk', [SalePaymentController::class, 'bulkStore']);
            Route::post('{sale}/payments/{payment}/confirm', [SalePaymentController::class, 'confirm']);
            Route::post('{sale}/payments/{payment}/fail', [SalePaymentController::class, 'fail']);
            Route::get('{sale}/qr', [SaleController::class, 'getPaymentQr']);
            Route::post('{sale}/close', [SaleController::class, 'close']);
            Route::post('{sale}/void', [SaleController::class, 'void']);
            Route::get('{sale}/ticket', [SaleTicketController::class, 'show']);

            if ($includeProtectedOnly) {
                Route::post('{sale}/ticket/email', [SaleTicketController::class, 'email']);
                Route::get('{sale}/ticket/email-status/{requestId}', [SaleTicketController::class, 'emailStatus']);
                Route::post('{sale}/ticket/share/whatsapp/file', [SaleTicketController::class, 'uploadWhatsappFile']);
                Route::post('{sale}/ticket/share/whatsapp', [SaleTicketController::class, 'shareWhatsapp']);
            }
        });
    }
}
