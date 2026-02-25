<?php

namespace App\Services\Authorization;

use App\Models\BusinessRolePermission;
use App\Models\User;
use App\Support\PermissionCatalog;

class BusinessPermissionResolver
{
    private ?string $role = null;

    /**
     * @var array<string, bool>
     */
    private array $permissions = [];

    /**
     * Resuelve el rol del usuario en el negocio y su mapa de permisos efectivo.
     *
     * @return array{role: string|null, permissions: array<string, bool>}
     */
    public function resolve(User $user, int $businessId): array
    {
        $this->role = $user->businesses()
            ->where('business_id', $businessId)
            ->value('role');

        $this->permissions = $this->resolvePermissions($businessId, $this->role);

        return [
            'role' => $this->role,
            'permissions' => $this->permissions,
        ];
    }

    public function role(): ?string
    {
        return $this->role;
    }

    /**
     * @return array<string, bool>
     */
    public function permissions(): array
    {
        return $this->permissions;
    }

    public function can(string $permissionKey): bool
    {
        return $this->permissions[$permissionKey] ?? false;
    }

    /**
     * @return array<string, bool>
     */
    private function resolvePermissions(int $businessId, ?string $role): array
    {
        $knownPermissionKeys = PermissionCatalog::all();

        if ($role === 'owner') {
            return array_fill_keys($knownPermissionKeys, true);
        }

        $permissions = array_fill_keys($knownPermissionKeys, false);

        if (!in_array($role, ['admin', 'cashier'], true)) {
            return $permissions;
        }

        $rolePermissions = BusinessRolePermission::query()
            ->where('business_id', $businessId)
            ->where('role', $role)
            ->pluck('allowed', 'permission_key');

        foreach ($rolePermissions as $permissionKey => $allowed) {
            if (array_key_exists($permissionKey, $permissions)) {
                $permissions[$permissionKey] = (bool) $allowed;
            }
        }

        return $permissions;
    }
}
