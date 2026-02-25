<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateRolePermissionsRequest;
use App\Models\BusinessRolePermission;
use App\Models\BusinessUser;
use App\Services\Authorization\BusinessPermissionResolver;
use App\Services\BusinessContext;
use App\Support\PermissionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RolePermissionController extends Controller
{
    public function __construct(
        private readonly BusinessContext $businessContext,
        private readonly BusinessPermissionResolver $permissionResolver,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $businessId = $this->businessContext->getBusinessId();

        if (! $businessId) {
            return response()->json(['success' => false, 'message' => 'Business not selected'], 403);
        }

        if (! $this->canManageRolePermissions($request, $businessId)) {
            return response()->json(['success' => false, 'message' => 'No autorizado para gestionar permisos de rol.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $this->buildRolePermissionMatrix($businessId),
        ]);
    }

    public function update(UpdateRolePermissionsRequest $request): JsonResponse
    {
        $businessId = $this->businessContext->getBusinessId();

        if (! $businessId) {
            return response()->json(['success' => false, 'message' => 'Business not selected'], 403);
        }

        $payload = collect($request->validated('role_permissions'))
            ->map(fn (array $row): array => [
                'business_id' => $businessId,
                'role' => $row['role'],
                'permission_key' => $row['permission_key'],
                'allowed' => (bool) $row['allowed'],
                'updated_at' => now(),
                'created_at' => now(),
            ])
            ->unique(fn (array $row): string => $row['role'].'|'.$row['permission_key'])
            ->values()
            ->all();

        BusinessRolePermission::upsert(
            $payload,
            ['business_id', 'role', 'permission_key'],
            ['allowed', 'updated_at']
        );

        return response()->json([
            'success' => true,
            'data' => $this->buildRolePermissionMatrix($businessId),
        ]);
    }

    public function authPermissions(Request $request): JsonResponse
    {
        $businessId = $this->businessContext->getBusinessId();

        if (! $businessId) {
            return response()->json(['success' => false, 'message' => 'Business not selected'], 403);
        }

        $resolved = $this->permissionResolver->resolve($request->user(), $businessId);

        return response()->json([
            'success' => true,
            'data' => [
                'role' => $resolved['role'],
                'permissions' => $resolved['permissions'],
                'permissions_by_module' => $this->groupPermissionMapByModule($resolved['permissions']),
            ],
        ]);
    }

    private function canManageRolePermissions(Request $request, int $businessId): bool
    {
        $role = $request->user()
            ?->businesses()
            ->where('business_id', $businessId)
            ->value('role');

        return in_array($role, [BusinessUser::ROLE_OWNER, BusinessUser::ROLE_ADMIN], true);
    }

    /**
     * @return array{roles: list<string>, permissions: array<string, array<int, array{permission_key: string, allowed_by_role: array<string, bool>}>>}
     */
    private function buildRolePermissionMatrix(int $businessId): array
    {
        $roles = BusinessUser::roles();
        $knownKeys = PermissionCatalog::all();

        $allowedByRoleAndKey = [];
        foreach ($roles as $role) {
            $allowedByRoleAndKey[$role] = array_fill_keys($knownKeys, false);
        }

        $rolePermissions = BusinessRolePermission::query()
            ->where('business_id', $businessId)
            ->whereIn('role', $roles)
            ->whereIn('permission_key', $knownKeys)
            ->get(['role', 'permission_key', 'allowed']);

        foreach ($rolePermissions as $rolePermission) {
            $allowedByRoleAndKey[$rolePermission->role][$rolePermission->permission_key] = (bool) $rolePermission->allowed;
        }

        $grouped = [];

        foreach ($knownKeys as $permissionKey) {
            [$module] = explode('.', $permissionKey, 2);

            $allowedByRole = [];
            foreach ($roles as $role) {
                $allowedByRole[$role] = $allowedByRoleAndKey[$role][$permissionKey] ?? false;
            }

            $grouped[$module][] = [
                'permission_key' => $permissionKey,
                'allowed_by_role' => $allowedByRole,
            ];
        }

        return [
            'roles' => $roles,
            'permissions' => $grouped,
        ];
    }

    /**
     * @param  array<string, bool>  $permissions
     * @return array<string, array<string, bool>>
     */
    private function groupPermissionMapByModule(array $permissions): array
    {
        $grouped = [];

        foreach ($permissions as $permissionKey => $allowed) {
            [$module, $action] = array_pad(explode('.', $permissionKey, 2), 2, $permissionKey);
            $grouped[$module][$action] = (bool) $allowed;
        }

        return $grouped;
    }
}
