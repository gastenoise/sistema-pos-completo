<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesBusinessContext;
use App\Models\Sale;
use Illuminate\Foundation\Http\FormRequest;

class SaleAddItemRequest extends FormRequest
{
    use AuthorizesBusinessContext;

    public function authorize(): bool
    {
        /** @var Sale|null $sale */
        $sale = $this->route('sale');

        return $sale !== null && $this->hasBusinessContext() && $this->user()?->can('update', $sale);
    }

    public function rules(): array
    {
        return [
            'item_id' => 'required|integer|exists:items,id',
            'quantity' => 'required|integer|min:1',
            'unit_price_override' => 'nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'item_id.required' => 'Debe seleccionar un ítem para agregar.',
            'quantity.min' => 'La cantidad mínima es 1.',
        ];
    }
}
