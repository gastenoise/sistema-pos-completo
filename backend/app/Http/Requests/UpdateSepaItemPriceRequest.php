<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesBusinessContext;
use App\Models\BusinessParameter;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSepaItemPriceRequest extends FormRequest
{
    use AuthorizesBusinessContext;

    public function authorize(): bool
    {
        if (!$this->userBelongsToCurrentBusiness()) {
            return false;
        }

        $businessId = $this->currentBusinessId();

        if ($businessId === null) {
            return false;
        }

        return BusinessParameter::query()
            ->where('business_id', $businessId)
            ->where('parameter_id', BusinessParameter::ENABLE_SEPA_ITEMS)
            ->exists();
    }

    public function rules(): array
    {
        return [
            'price' => ['nullable', 'numeric', 'min:0'],
            'category_id' => [
                'nullable',
                'integer',
                Rule::exists('categories', 'id')->where('business_id', (int) $this->currentBusinessId()),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'price.numeric' => 'El precio debe ser un número válido.',
            'price.min' => 'El precio no puede ser negativo.',
            'category_id.exists' => 'La categoría no pertenece al negocio actual.',
        ];
    }
}
