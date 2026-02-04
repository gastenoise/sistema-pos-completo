<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use App\Services\BusinessContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiKey
{
    public function __construct(protected BusinessContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $rawKey = $request->header('X-Api-Key');

        if (!$rawKey && $request->hasHeader('Authorization')) {
            $authorization = $request->header('Authorization');
            if (str_starts_with($authorization, 'ApiKey ')) {
                $rawKey = trim(substr($authorization, 7));
            }
        }

        if (!$rawKey) {
            return response()->json(['success' => false, 'message' => 'API key required'], 401);
        }

        $hash = hash('sha256', $rawKey);

        $apiKey = ApiKey::with(['user', 'business'])
            ->where('key_hash', $hash)
            ->whereNull('revoked_at')
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->first();

        if (!$apiKey) {
            return response()->json(['success' => false, 'message' => 'Invalid API key'], 401);
        }

        $apiKey->forceFill(['last_used_at' => now()])->save();

        if ($apiKey->user) {
            Auth::setUser($apiKey->user);
        }

        $this->context->setBusinessId($apiKey->business_id);
        $request->attributes->set('api_key', $apiKey);

        return $next($request);
    }
}
