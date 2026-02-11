<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\BusinessContext;
use App\Models\BusinessUser;
use Illuminate\Support\Facades\Auth;

class ResolveBusiness
{
    public function __construct(protected BusinessContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            return $next($request);
        }

        $user = Auth::user();

        // Exclusivamente usar el business por header
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json([
                'message' => 'Business context required',
                'error' => 'business_context_required',
                'code' => 'BUSINESS_CONTEXT_REQUIRED',
                'auth_status' => 'authenticated',
            ], 403);
        }

        // Validar que el usuario pertenece al negocio
        $exists = BusinessUser::where('user_id', $user->id)
            ->where('business_id', $businessId)
            ->exists();

        if ($exists) {
            $this->context->setBusinessId((int)$businessId);
        } else {
            return response()->json([
                'message' => 'Invalid business selection for this user',
                'error' => 'invalid_business_context',
                'code' => 'INVALID_BUSINESS_CONTEXT',
                'auth_status' => 'authenticated',
                'business_id' => (int) $businessId,
            ], 403);
        }

        return $next($request);
    }
}