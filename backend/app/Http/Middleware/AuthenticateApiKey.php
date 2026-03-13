<?php

namespace App\Http\Middleware;

use App\Events\ApiKeyAuthenticated;
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
            if (preg_match('/^ApiKey\s+(.+)$/i', $authorization, $matches)) {
                $rawKey = trim($matches[1]);
            }
        }

        if (!$rawKey || empty(trim($rawKey))) {
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

        event(new ApiKeyAuthenticated($apiKey->id));

        if ($apiKey->user) {
            Auth::setUser($apiKey->user);
        }

        $this->context->setBusinessId($apiKey->business_id);
        $request->attributes->set('api_key', $apiKey);

        return $next($request);
    }
}
