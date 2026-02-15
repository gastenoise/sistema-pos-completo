<?php

namespace App\Http\Controllers;

use App\Models\ApiKey;
use App\Services\BusinessContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ApiKeyController extends Controller
{
    public function index()
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        $keys = ApiKey::where('business_id', $businessId)
            ->whereNull('revoked_at')
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $keys]);
    }

    public function store(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'expires_at' => 'nullable|date|after:now',
        ]);

        $plainKey = Str::random(64);

        $apiKey = ApiKey::create([
            'business_id' => $businessId,
            'user_id' => Auth::id(),
            'name' => $validated['name'],
            'key_hash' => hash('sha256', $plainKey),
            'expires_at' => $validated['expires_at'] ?? null,
        ]);

        Log::info('api_key_security_audit', [
            'action' => 'create',
            'performed_by' => Auth::id(),
            'performed_at' => now()->toIso8601String(),
            'business_id' => $businessId,
            'api_key_id' => $apiKey->id,
            'key_prefix' => substr($plainKey, 0, 8),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'api_key' => $apiKey,
                'plain_key' => $plainKey,
            ]
        ], 201);
    }

    public function destroy(ApiKey $apiKey)
    {
        $apiKey->update(['revoked_at' => now()]);

        Log::info('api_key_security_audit', [
            'action' => 'revoke',
            'performed_by' => Auth::id(),
            'performed_at' => now()->toIso8601String(),
            'business_id' => $apiKey->business_id,
            'api_key_id' => $apiKey->id,
            'key_prefix' => substr($apiKey->key_hash, 0, 8),
        ]);

        return response()->json(['success' => true, 'message' => 'API key revoked']);
    }
}
