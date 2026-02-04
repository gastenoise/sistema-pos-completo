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
            // Si no hay business seteado en sesión, retornar error en JSON
            return response()->json(['message' => 'Business context required'], 403);
        }

        // Validar que el usuario pertenece al negocio
        $exists = BusinessUser::where('user_id', $user->id)
            ->where('business_id', $businessId)
            ->exists();

        if ($exists) {
            $this->context->setBusinessId((int)$businessId);
        } else {
            // Si intenta acceder a un negocio que no es suyo, prohibido
            return response()->json(['message' => 'Invalid Business Context'], 403);
        }

        return $next($request);
    }
}