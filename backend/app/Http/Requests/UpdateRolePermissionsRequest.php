<?php

namespace App\Http\Requests;

use App\Models\BusinessUser;
use App\Services\Authorization\BusinessPermissionResolver;
use App\Services\BusinessContext;
use App\Support\PermissionCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRolePermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $businessId = app(BusinessContext::class)->getBusinessId();

        if (! $user || ! $businessId) {
            return false;
        }

        $permissionResolver = app(BusinessPermissionResolver::class);
        $resolved = $permissionResolver->resolve($user, $businessId);

        if (($resolved['role'] ?? null) === BusinessUser::ROLE_OWNER) {
            return true;
        }

        return $permissionResolver->can(PermissionCatalog::SETTINGS_PERMISSIONS_MANAGE);
    }

    public function rules(): array
    {
        return [
            'role_permissions' => ['required', 'array', 'min:1'],
            'role_permissions.*.role' => ['required', 'string', Rule::in(BusinessUser::roles())],
            'role_permissions.*.permission_key' => ['required', 'string', Rule::in(PermissionCatalog::all())],
            'role_permissions.*.allowed' => ['required', 'boolean'],
        ];
    }
}
