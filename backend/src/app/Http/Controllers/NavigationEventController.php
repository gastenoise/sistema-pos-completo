<?php

namespace App\Http\Controllers;

use App\Models\NavigationEvent;
use App\Services\BusinessContext;
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

        $businessId = app(BusinessContext::class)->check()
            ? app(BusinessContext::class)->getBusinessId()
            : null;

        $event = NavigationEvent::create([
            'business_id' => $businessId,
            'user_id' => Auth::id(),
            'path' => $validated['path'],
            'screen' => $validated['screen'] ?? null,
            'metadata' => $validated['metadata'] ?? null,
        ]);

        return response()->json(['success' => true, 'data' => $event], 201);
    }
}
