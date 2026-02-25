<?php

use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BankAccountController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\CashRegisterController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\InformationController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\MercadoPagoController;
use App\Http\Controllers\NavigationEventController;
use App\Http\Controllers\PaymentMethodController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SalePaymentController;
use App\Http\Controllers\SaleTicketController;
use Illuminate\Support\Facades\Route;

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

    /*
    |--------------------------------------------------------------------------
    | Protected Routes (Requieren Token)
    |--------------------------------------------------------------------------
    */
    Route::middleware(['web', 'auth:sanctum'])->group(function () {
        Route::middleware('ensure.token.fresh')->group(function () {
            Route::prefix('auth')->group(function () {
                Route::get('me', [AuthController::class, 'me']);
                Route::put('me', [AuthController::class, 'updateMe']);
                Route::post('logout', [AuthController::class, 'logout']);
                // Route::put('change-email', [AuthController::class, 'changeEmail']);
                Route::put('change-password', [AuthController::class, 'changePassword']);
            });

            // Selección de Negocio (Para establecer el contexto multi-tenant)
            Route::get('businesses', [BusinessController::class, 'index']);
            Route::post('businesses/select', [BusinessController::class, 'select']);

            Route::get('payment-methods/all', [PaymentMethodController::class, 'index']);
            // Endpoints informativos (no requieren business)
            Route::get('info/colors', [InformationController::class, 'colors']);
            Route::get('info/payment-methods', [InformationController::class, 'paymentMethods']);

            // Eventos de navegación (autenticado, no requiere business obligatorio)
            Route::post('navigation-events', [NavigationEventController::class, 'store']);

            /*
            |----------------------------------------------------------------------
            | Business Scoped Routes (Requieren business_id en sesión/header)
            |----------------------------------------------------------------------
            */
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

                // Categorías
                Route::apiResource('categories', CategoryController::class);

                // Cuentas Bancarias
                Route::get('banks', [BankAccountController::class, 'index']);
                Route::put('banks', [BankAccountController::class, 'update']);

                // Métodos de pago
                Route::get('payment-methods', [PaymentMethodController::class, 'activeForBusiness']);
                Route::post('payment-methods', [PaymentMethodController::class, 'bulkToggleHideForBusiness']);
                Route::put('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'toggleHideForBusiness']);

                // Ítems (Productos/Servicios)
                Route::patch('items/bulk', [ItemController::class, 'bulkUpdate']);
                Route::put('sepa-items/{sepaItem}/price', [ItemController::class, 'updateSepaPrice']);
                Route::apiResource('items', ItemController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
                Route::prefix('items-import')->group(function () {
                    Route::post('preview', [ItemController::class, 'importPreview']);
                    Route::post('preview/full', [ItemController::class, 'importPreviewFull']);
                    Route::post('confirm', [ItemController::class, 'importConfirm']);
                });

                // Caja (Cash Register)
                Route::prefix('cash-register')->group(function () {
                    Route::get('status', [CashRegisterController::class, 'status']);
                    Route::post('open', [CashRegisterController::class, 'open']);
                    Route::post('close', [CashRegisterController::class, 'close']);
                    Route::get('sessions/closed', [CashRegisterController::class, 'closedSessions']);
                    Route::get('{session}/expected-totals', [CashRegisterController::class, 'getExpectedTotals']);
                });

                // Ventas (Sales)
                Route::prefix('sales')->scopeBindings()->group(function () {
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
                    // Fuente de datos oficial para renderizar tickets en front-end.
                    Route::get('{sale}/ticket', [SaleTicketController::class, 'show']);
                    Route::post('{sale}/ticket/email', [SaleTicketController::class, 'email']);
                    Route::get('{sale}/ticket/email-status/{requestId}', [SaleTicketController::class, 'emailStatus']);
                    Route::post('{sale}/ticket/share/whatsapp/file', [SaleTicketController::class, 'uploadWhatsappFile']);
                    Route::post('{sale}/ticket/share/whatsapp', [SaleTicketController::class, 'shareWhatsapp']);
                });

                // Reportes
                Route::prefix('reports')->group(function () {
                    Route::get('daily-summary', [ReportController::class, 'dailySummary']);
                    Route::get('sales', [ReportController::class, 'salesList']);
                    Route::get('summary', [ReportController::class, 'salesSummary']);
                    Route::get('export', [ReportController::class, 'export']);
                });
            });
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

    Route::apiResource('categories', CategoryController::class);
    Route::get('banks', [BankAccountController::class, 'index']);
    Route::put('banks', [BankAccountController::class, 'update']);

    Route::get('payment-methods', [PaymentMethodController::class, 'activeForBusiness']);
    Route::post('payment-methods', [PaymentMethodController::class, 'bulkToggleHideForBusiness']);
    Route::put('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'toggleHideForBusiness']);

    Route::apiResource('items', ItemController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
    Route::prefix('items-import')->group(function () {
        Route::post('preview', [ItemController::class, 'importPreview']);
        Route::post('preview/full', [ItemController::class, 'importPreviewFull']);
        Route::post('confirm', [ItemController::class, 'importConfirm']);
    });

    Route::prefix('cash-register')->group(function () {
        Route::get('status', [CashRegisterController::class, 'status']);
        Route::post('open', [CashRegisterController::class, 'open']);
        Route::post('close', [CashRegisterController::class, 'close']);
        Route::get('{session}/expected-totals', [CashRegisterController::class, 'getExpectedTotals']);
    });

    Route::prefix('sales')->scopeBindings()->group(function () {
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
        // Fuente de datos oficial para renderizar tickets en front-end.
        Route::get('{sale}/ticket', [SaleTicketController::class, 'show']);
    });

    Route::get('reports/daily-summary', [ReportController::class, 'dailySummary']);
    Route::get('reports/sales', [ReportController::class, 'salesList']);
    Route::get('reports/summary', [ReportController::class, 'salesSummary']);
    Route::get('reports/export', [ReportController::class, 'export']);
});
