<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureTokenIsFresh
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();

        if (!$token) {
            return $next($request);
        }

        if (!$token->can('front')) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid token for frontend session.'
            ], 403);
        }

        $idleMinutes = config('sanctum.frontend_idle_minutes', 60);
        $lastActivity = $token->last_used_at ?? $token->created_at;

        if ($idleMinutes && $lastActivity && $lastActivity->lt(now()->subMinutes($idleMinutes))) {
            $token->delete();
            Auth::guard('web')->logout();

            return response()->json([
                'success' => false,
                'message' => 'Session expired. Please log in again.'
            ], 401);
        }

        return $next($request);
    }
}
