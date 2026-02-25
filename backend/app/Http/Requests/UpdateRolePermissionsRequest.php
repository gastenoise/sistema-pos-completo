<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesBusinessContext;
use App\Models\BusinessUser;
use App\Support\PermissionCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRolePermissionsRequest extends FormRequest
{
    use AuthorizesBusinessContext;

    public function authorize(): bool
    {
        return $this->userBelongsToCurrentBusiness(['owner', 'admin']);
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
