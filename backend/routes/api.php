<?php

use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\InformationController;
use App\Http\Controllers\MercadoPagoController;
use App\Http\Controllers\NavigationEventController;
use App\Http\Controllers\PaymentMethodController;
use App\Http\Controllers\RolePermissionController;
use Illuminate\Support\Facades\Route;

require __DIR__.'/partials/catalog.php';
require __DIR__.'/partials/sales.php';
require __DIR__.'/partials/cash-register.php';
require __DIR__.'/partials/reports.php';

/*
|--------------------------------------------------------------------------
| Public Routes (Front - Public Access)
|--------------------------------------------------------------------------
*/
Route::prefix('protected')->group(function () {
    Route::prefix('auth')->middleware('web')->group(function () {
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login')->name('login');
        Route::post('register', [AuthController::class, 'register']);
    });

    Route::get('mercadopago/test', [MercadoPagoController::class, 'testConfig']);
    Route::post('mercadopago/preferencia', [MercadoPagoController::class, 'crearPreferencia']);

    Route::middleware(['web', 'auth:sanctum', 'ensure.token.fresh'])->group(function () {
        Route::prefix('auth')->group(function () {
            Route::get('me', [AuthController::class, 'me']);
            Route::put('me', [AuthController::class, 'updateMe']);
            Route::post('logout', [AuthController::class, 'logout']);
            Route::put('change-password', [AuthController::class, 'changePassword']);
        });

        Route::get('businesses', [BusinessController::class, 'index']);
        Route::post('businesses/select', [BusinessController::class, 'select']);

        Route::get('payment-methods/all', [PaymentMethodController::class, 'index']);
        Route::get('info/colors', [InformationController::class, 'colors']);
        Route::get('info/payment-methods', [InformationController::class, 'paymentMethods']);
        Route::post('navigation-events', [NavigationEventController::class, 'store']);

        Route::middleware('resolve.business')->group(function () {
            Route::get('auth/permissions', [RolePermissionController::class, 'authPermissions']);

            Route::prefix('business')->group(function () {
                Route::get('smtp', [BusinessController::class, 'getSmtpSettings']);
                Route::get('smtp/status', [BusinessController::class, 'smtpStatus']);
                Route::put('smtp', [BusinessController::class, 'updateSmtpSettings']);
                Route::post('smtp/test', [BusinessController::class, 'testSmtpSettings']);
                Route::put('/', [BusinessController::class, 'update']);
                Route::get('role-permissions', [RolePermissionController::class, 'index']);
                Route::put('role-permissions', [RolePermissionController::class, 'update']);
            });

            Route::get('api-keys', [ApiKeyController::class, 'index'])
                ->middleware('can:viewAny,App\Models\ApiKey');
            Route::post('api-keys', [ApiKeyController::class, 'store'])
                ->middleware('can:create,App\Models\ApiKey');
            Route::delete('api-keys/{apiKey}', [ApiKeyController::class, 'destroy'])
                ->middleware('can:delete,apiKey');

            registerCatalogRoutes(['includeProtectedOnly' => true]);
            registerCashRegisterRoutes(['includeProtectedOnly' => true]);
            registerSalesRoutes(['includeProtectedOnly' => true]);
            registerReportRoutes();
        });
    });
});

/*
|--------------------------------------------------------------------------
| Public API Routes (API Key)
|--------------------------------------------------------------------------
*/
Route::prefix('public')->middleware(['auth.apikey', 'throttle:public-api'])->group(function () {
    Route::get('payment-methods/all', [PaymentMethodController::class, 'index']);
    Route::get('info/colors', [InformationController::class, 'colors']);
    Route::get('info/payment-methods', [InformationController::class, 'paymentMethods']);

    registerCatalogRoutes();
    registerCashRegisterRoutes();
    registerSalesRoutes();
    registerReportRoutes();
});
