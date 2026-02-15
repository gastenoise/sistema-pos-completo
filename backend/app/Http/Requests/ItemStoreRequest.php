<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesBusinessContext;
use App\Http\Requests\Concerns\HasItemRules;
use Illuminate\Foundation\Http\FormRequest;

class ItemStoreRequest extends FormRequest
{
    use AuthorizesBusinessContext;
    use HasItemRules;

    public function authorize(): bool
    {
        return $this->userBelongsToCurrentBusiness();
    }

    public function rules(): array
    {
        return array_merge($this->itemRules(itemId: null), [
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
        ]);
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre del ítem es obligatorio.',
            'price.required' => 'El precio del ítem es obligatorio.',
            'barcode.regex' => 'El código de barras solo puede contener letras, números, guiones, guiones bajos y puntos.',
            'barcode.unique' => 'Ya existe un ítem con ese código de barras en este negocio.',
        ];
    }
}
