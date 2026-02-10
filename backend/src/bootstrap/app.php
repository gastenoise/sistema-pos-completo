<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

use App\Http\Middleware\ResolveBusiness;
use App\Http\Middleware\AuthenticateApiKey;
use App\Http\Middleware\EnsureTokenIsFresh;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Auth\Access\AuthorizationException;

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
        $exceptions->render(function (AuthorizationException $exception) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden',
            ], 403);
        });
    })->create();
