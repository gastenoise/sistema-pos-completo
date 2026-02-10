<?php

namespace App\Http\Middleware;

use App\Services\BusinessContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBusinessRole
{
    public function __construct(protected BusinessContext $context) {}

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $businessId = $this->context->getBusinessId() ?? (int) $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business context required'], 403);
        }

        foreach ($roles as $role) {
            if ($user->hasRole($role, $businessId)) {
                return $next($request);
            }
        }

        return response()->json(['message' => 'Forbidden'], 403);
    }
}
