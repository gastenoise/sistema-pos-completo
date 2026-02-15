<?php

namespace App\Http\Controllers;

use App\Models\BankAccount;
use App\Models\Business;
use Illuminate\Http\Request;
use App\Services\BusinessContext;

class BankAccountController extends Controller
{
    public function index()
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $business = Business::find($businessId);

        if (!$business) {
            return response()->json(['success' => false, 'message' => 'Business not found'], 404);
        }

        $bankAccount = $business->bankAccount;

        if (!$bankAccount) {
            $bankAccount = new BankAccount([
                'business_id' => $business->id,
            ]);
        }

        return response()->json(['success' => true, 'data' => $bankAccount]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'cbu' => 'nullable|string|max:22',
            'alias' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:100',
            'account_holder_name' => 'nullable|string|max:100',
        ]);

        $businessId = app(BusinessContext::class)->getBusinessId();
        $business = Business::find($businessId);

        if (!$business) {
            return response()->json(['success' => false, 'message' => 'Business not found'], 404);
        }

        $bankAccount = $business->bankAccount ?: new BankAccount(['business_id' => $business->id]);
        $bankAccount->fill($validated);
        $bankAccount->save();

        return response()->json(['success' => true, 'data' => $bankAccount->fresh()]);
    }
}
