<?php

namespace App\Http\Controllers;

use App\Models\BusinessUser;
use App\Models\NavigationEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NavigationEventController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'path' => 'required|string|max:2048',
            'screen' => 'nullable|string|max:255',
            'metadata' => 'nullable|array',
        ]);

        $authUserId = Auth::id();
        $headerBusinessId = $request->header('X-Business-Id');

        if (!is_numeric($headerBusinessId)) {
            return response()->json([
                'success' => true,
                'message' => 'Navigation event skipped: business context header is missing.',
            ], 202);
        }

        $businessId = (int) $headerBusinessId;

        $membershipExists = BusinessUser::where('user_id', $authUserId)
            ->where('business_id', $businessId)
            ->exists();

        if (!$membershipExists) {
            return response()->json([
                'success' => true,
                'message' => 'Navigation event skipped: invalid business context for current user.',
            ], 202);
        }

        $event = NavigationEvent::create([
            'business_id' => $businessId,
            'user_id' => $authUserId,
            'path' => $validated['path'],
            'screen' => $validated['screen'] ?? null,
            'metadata' => $validated['metadata'] ?? null,
        ]);

        return response()->json(['success' => true, 'data' => $event], 201);
    }
}
