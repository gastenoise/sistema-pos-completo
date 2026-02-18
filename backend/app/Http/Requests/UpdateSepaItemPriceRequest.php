<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesBusinessContext;
use App\Models\BusinessParameter;
use Illuminate\Foundation\Http\FormRequest;

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
            'price' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'price.required' => 'El precio es obligatorio.',
            'price.numeric' => 'El precio debe ser un número válido.',
            'price.min' => 'El precio no puede ser negativo.',
        ];
    }
}
