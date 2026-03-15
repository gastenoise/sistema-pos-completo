<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetSecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->isMethod('OPTIONS')) {
            return $response;
        }

        $csp = [
            "default-src 'none'",
            "base-uri 'self'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "img-src 'self' data:",
            "style-src 'self' 'unsafe-inline'",
            "script-src 'self'",
            "object-src 'none'",
        ];

        // Allow connect-src for the app and API domains if in production, or be more permissive for SPA flow
        if (config('app.env') === 'production') {
            $allowedOrigins = config('cors.allowed_origins', []);
            if (is_string($allowedOrigins)) {
                $allowedOrigins = explode(',', $allowedOrigins);
            }
            $connectSrc = implode(' ', array_merge(['\'self\''], (array) $allowedOrigins));
            $csp[] = "connect-src $connectSrc";
        } else {
            $csp[] = "connect-src *";
        }

        $response->headers->set('Content-Security-Policy', implode('; ', $csp));
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        return $response;
    }
}
