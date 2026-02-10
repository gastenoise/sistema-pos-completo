<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

use App\Http\Middleware\ResolveBusiness;
use App\Http\Middleware\AuthenticateApiKey;
use App\Http\Middleware\EnsureTokenIsFresh;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: '',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(HandleCors::class);
        //
        $middleware->alias([
            'resolve.business' => \App\Http\Middleware\ResolveBusiness::class,
            'auth.apikey' => AuthenticateApiKey::class,
            'ensure.token.fresh' => EnsureTokenIsFresh::class,
            // otros middlewares...
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Throwable $exception, Request $request) {
            if (!$request->is('api/*') && !$request->expectsJson()) {
                return null;
            }

            $requestId = (string) ($request->attributes->get('request_id')
                ?? $request->header('X-Request-Id')
                ?? $request->header('X-Correlation-Id')
                ?? Str::uuid());

            Log::error('Unhandled API exception', [
                'request_id' => $requestId,
                'path' => $request->path(),
                'exception_class' => $exception::class,
                'exception_message' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno, intente nuevamente.',
                'request_id' => $requestId,
            ], 500);
        });
    })->create();
