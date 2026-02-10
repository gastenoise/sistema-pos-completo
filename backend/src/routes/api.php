<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    AuthController,
    ApiKeyController,
    BankAccountController,
    BusinessController, 
    ItemController, 
    CategoryController,
    SaleController, 
    CashRegisterController, 
    ReportController,
    MercadoPagoController,
    PaymentMethodController,
    InformationController,
    NavigationEventController,
    SalePaymentController,
    SaleTicketController
};

/*
|--------------------------------------------------------------------------
| Public Routes (Front - Public Access)
|--------------------------------------------------------------------------
*/
Route::prefix('protected')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('login');
    Route::post('auth/register', [AuthController::class, 'register']);

    Route::get('mercadopago/test', [MercadoPagoController::class, 'testConfig']);
    Route::post('mercadopago/preferencia', [MercadoPagoController::class, 'crearPreferencia']);

    /*
    |--------------------------------------------------------------------------
    | Protected Routes (Requieren Token)
    |--------------------------------------------------------------------------
    */
    Route::middleware('auth:sanctum')->group(function () {
        Route::middleware('ensure.token.fresh')->group(function () {
            Route::get('auth/me', [AuthController::class, 'me']);
            Route::put('auth/me', [AuthController::class, 'updateMe']);

            Route::put('auth/change-email', [AuthController::class, 'changeEmail']);
            Route::put('auth/change-password', [AuthController::class, 'changePassword']);

            // Selección de Negocio (Para establecer el contexto multi-tenant)
            Route::get('businesses', [BusinessController::class, 'index']);
            Route::post('businesses/select', [BusinessController::class, 'select']);

            Route::get('payment-methods/all', [PaymentMethodController::class, 'index']);
            // Endpoints informativos (no requieren business)
            Route::get('info/colors', [InformationController::class, 'colors']);
            Route::get('info/payment-methods', [InformationController::class, 'paymentMethods']);

            /*
            |----------------------------------------------------------------------
            | Business Scoped Routes (Requieren business_id en sesión/header)
            |----------------------------------------------------------------------
            */
            Route::middleware('resolve.business')->group(function () {
                Route::get('business/smtp', [BusinessController::class, 'getSmtpSettings']);
                Route::put('business/smtp', [BusinessController::class, 'updateSmtpSettings']);
                Route::post('business/smtp/test', [BusinessController::class, 'testSmtpSettings']);
                Route::put('business', [BusinessController::class, 'update']);

                Route::apiResource('api-keys', ApiKeyController::class)
                    ->only(['index', 'store', 'destroy']);

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
                Route::apiResource('items', ItemController::class);
                Route::prefix('items-import')->group(function () {
                    Route::post('preview', [ItemController::class, 'importPreview']);
                    Route::post('confirm', [ItemController::class, 'importConfirm']);
                });

                // Eventos de navegación
                Route::post('navigation-events', [NavigationEventController::class, 'store']);

                // Caja (Cash Register)
                Route::prefix('cash-register')->group(function () {
                    Route::get('status', [CashRegisterController::class, 'status']);
                    Route::post('open', [CashRegisterController::class, 'open']);
                    Route::post('close', [CashRegisterController::class, 'close']);
                    Route::get('sessions/closed', [CashRegisterController::class, 'closedSessions']);
                    Route::get('{session}/expected-totals', [CashRegisterController::class, 'getExpectedTotals']);
                });

                // Ventas (Sales)
                Route::prefix('sales')->group(function () {
                    Route::post('/', [SaleController::class, 'store']);
                    Route::get('{sale}', [SaleController::class, 'show']);
                    Route::post('{sale}/items', [SaleController::class, 'addItem']);
                    Route::delete('{sale}/items/{saleItem}', [SaleController::class, 'removeItem']);
                    Route::post('{sale}/payments', [SaleController::class, 'addPayment']);
                    Route::post('{sale}/payments/{payment}/confirm', [SalePaymentController::class, 'confirm']);
                    Route::post('{sale}/payments/{payment}/fail', [SalePaymentController::class, 'fail']);
                    Route::get('{sale}/qr', [SaleController::class, 'getPaymentQr']);
                    Route::post('{sale}/close', [SaleController::class, 'close']);
                    Route::post('{sale}/void', [SaleController::class, 'void']);
                    // Fuente de datos oficial para renderizar tickets en front-end.
                    Route::get('{sale}/ticket', [SaleTicketController::class, 'show']);
                    Route::post('{sale}/ticket/email', [SaleTicketController::class, 'email']);
                    Route::post('{sale}/ticket/share/whatsapp/file', [SaleTicketController::class, 'uploadWhatsappFile']);
                    Route::post('{sale}/ticket/share/whatsapp', [SaleTicketController::class, 'shareWhatsapp']);
                });

                // Reportes
                Route::get('reports/daily-summary', [ReportController::class, 'dailySummary']);
                Route::get('reports/sales', [ReportController::class, 'salesList']);
                Route::get('reports/summary', [ReportController::class, 'salesSummary']);
                Route::get('reports/export', [ReportController::class, 'export']);
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

    Route::apiResource('items', ItemController::class);
    Route::prefix('items-import')->group(function() {
        Route::post('preview', [ItemController::class, 'importPreview']);
        Route::post('confirm', [ItemController::class, 'importConfirm']);
    });

    Route::prefix('cash-register')->group(function() {
        Route::get('status', [CashRegisterController::class, 'status']);
        Route::post('open', [CashRegisterController::class, 'open']);
        Route::post('close', [CashRegisterController::class, 'close']);
        Route::get('{session}/expected-totals', [CashRegisterController::class, 'getExpectedTotals']);
    });

    Route::prefix('sales')->group(function() {
        Route::post('/', [SaleController::class, 'store']);
        Route::get('{sale}', [SaleController::class, 'show']);
        Route::post('{sale}/items', [SaleController::class, 'addItem']);
        Route::delete('{sale}/items/{saleItem}', [SaleController::class, 'removeItem']);
        Route::post('{sale}/payments', [SaleController::class, 'addPayment']);
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
