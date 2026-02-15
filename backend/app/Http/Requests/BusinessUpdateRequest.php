<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesBusinessContext;
use Illuminate\Foundation\Http\FormRequest;

class BusinessUpdateRequest extends FormRequest
{
    use AuthorizesBusinessContext;

    public function authorize(): bool
    {
        return $this->userBelongsToCurrentBusiness(['owner', 'admin']);
    }

    public function rules(): array
    {
        return [
            'name' => 'nullable|string|max:255',
            'color' => ['nullable', 'regex:/^#([A-Fa-f0-9]{6})$/'],
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'tax_id' => 'nullable|string|max:20',
            'preferred_payment_method_id' => 'nullable|integer|exists:payment_methods,id',
            'business_parameters' => 'nullable|array',
            'business_parameters.*' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'business_parameters.array' => 'Los parámetros de negocio deben enviarse como arreglo.',
            'business_parameters.*.boolean' => 'Cada parámetro de negocio debe ser booleano.',
        ];
    }
}
