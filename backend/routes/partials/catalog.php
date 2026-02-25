<?php

use App\Http\Controllers\BankAccountController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\PaymentMethodController;
use Illuminate\Support\Facades\Route;

if (! function_exists('registerCatalogRoutes')) {
    /**
     * Registra endpoints de catálogo reutilizables para protected/public.
     *
     * @param  array{middleware?: string|array<int,string>, includeProtectedOnly?: bool}  $context
     */
    function registerCatalogRoutes(array $context = []): void
    {
        $middleware = $context['middleware'] ?? [];
        $includeProtectedOnly = (bool) ($context['includeProtectedOnly'] ?? false);

        Route::middleware($middleware)->group(function () use ($includeProtectedOnly) {
            Route::apiResource('categories', CategoryController::class);

            Route::get('banks', [BankAccountController::class, 'index']);
            Route::put('banks', [BankAccountController::class, 'update']);

            Route::get('payment-methods', [PaymentMethodController::class, 'activeForBusiness']);
            Route::post('payment-methods', [PaymentMethodController::class, 'bulkToggleHideForBusiness']);
            Route::put('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'toggleHideForBusiness']);

            if ($includeProtectedOnly) {
                Route::patch('items/bulk', [ItemController::class, 'bulkUpdate']);
                Route::put('sepa-items/{sepaItem}/price', [ItemController::class, 'updateSepaPrice']);
            }

            Route::apiResource('items', ItemController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
            Route::prefix('items-import')->group(function () {
                Route::post('preview', [ItemController::class, 'importPreview']);
                Route::post('preview/full', [ItemController::class, 'importPreviewFull']);
                Route::post('confirm', [ItemController::class, 'importConfirm']);
            });
        });
    }
}
