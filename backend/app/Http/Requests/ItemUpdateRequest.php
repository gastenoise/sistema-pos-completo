<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesBusinessContext;
use App\Http\Requests\Concerns\HasItemRules;
use App\Models\Item;
use Illuminate\Foundation\Http\FormRequest;

class ItemUpdateRequest extends FormRequest
{
    use AuthorizesBusinessContext;
    use HasItemRules;

    public function authorize(): bool
    {
        /** @var Item|null $item */
        $item = $this->route('item');

        if (!$item || !$this->userBelongsToCurrentBusiness()) {
            return false;
        }

        return (int) $item->business_id === (int) $this->currentBusinessId();
    }

    public function rules(): array
    {
        /** @var Item|null $item */
        $item = $this->route('item');

        return $this->itemRules(partial: true, itemId: $item?->id);
    }

    public function messages(): array
    {
        return [
            'name.string' => 'El nombre del ítem debe ser texto válido.',
            'price.numeric' => 'El precio debe ser un número válido.',
            'barcode.regex' => 'El código de barras solo puede contener letras, números, guiones, guiones bajos y puntos.',
            'barcode.unique' => 'Ya existe un ítem con ese código de barras en este negocio.',
        ];
    }
}
