<?php

namespace App\Http\Controllers;

use App\Models\Business;
use App\Models\BusinessUser;
use App\Models\User;
use App\Services\BusinessContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BusinessUserController extends Controller
{
    public function __construct(
        private readonly BusinessContext $businessContext,
    ) {}

    public function index(): JsonResponse
    {
        $businessId = $this->businessContext->getBusinessId();

        if (!$businessId) {
            return response()->json(['success' => false, 'message' => 'Business not selected'], 403);
        }

        $business = Business::findOrFail($businessId);
        $users = $business->users()->get()->map(function (User $user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->pivot->role,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    public function update(Request $request, int $userId): JsonResponse
    {
        $businessId = $this->businessContext->getBusinessId();

        if (!$businessId) {
            return response()->json(['success' => false, 'message' => 'Business not selected'], 403);
        }

        if ($request->input('role') === BusinessUser::ROLE_OWNER) {
            return response()->json([
                'success' => false,
                'message' => 'El rol propietario solo puede asignarse manualmente por base de datos',
            ], 422);
        }

        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in([BusinessUser::ROLE_ADMIN, BusinessUser::ROLE_CASHIER])],
        ]);

        $pivot = BusinessUser::where('business_id', $businessId)
            ->where('user_id', $userId)
            ->firstOrFail();

        // Safety rule: prevent leaving business without owner
        if ($pivot->role === BusinessUser::ROLE_OWNER && $validated['role'] !== BusinessUser::ROLE_OWNER) {
            $ownersCount = BusinessUser::where('business_id', $businessId)
                ->where('role', BusinessUser::ROLE_OWNER)
                ->count();

            if ($ownersCount <= 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'No podés cambiar el rol del último propietario del negocio.',
                ], 422);
            }
        }

        $pivot->role = $validated['role'];
        $pivot->save();

        return response()->json([
            'success' => true,
            'message' => 'Rol de usuario actualizado correctamente.',
        ]);
    }
}
