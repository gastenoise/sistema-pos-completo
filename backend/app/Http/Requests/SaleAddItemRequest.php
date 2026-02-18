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
            'item_source' => 'nullable|in:local,sepa',
            'item_id' => 'nullable|integer|exists:items,id|required_without_all:sepa_item_id,catalog_item_id',
            'sepa_item_id' => 'nullable|integer|exists:sepa_items,id|required_without_all:item_id,catalog_item_id',
            'catalog_item_id' => 'nullable|string|max:64|required_without_all:item_id,sepa_item_id',
            'quantity' => 'required|integer|min:1',
            'unit_price_override' => 'nullable|numeric|min:0',
        ];
    }

    protected function prepareForValidation(): void
    {
        $catalogItemId = $this->input('catalog_item_id');

        if (!is_string($catalogItemId) || $catalogItemId === '') {
            return;
        }

        $source = $this->input('item_source');

        if (preg_match('/^(local|sepa):(\d+)$/', $catalogItemId, $matches) === 1) {
            $source = $matches[1];
            $id = (int) $matches[2];

            $this->merge([
                'item_source' => $source,
                $source === 'sepa' ? 'sepa_item_id' : 'item_id' => $id,
            ]);

            return;
        }

        if (is_numeric($catalogItemId) && in_array($source, ['local', 'sepa'], true)) {
            $this->merge([
                $source === 'sepa' ? 'sepa_item_id' : 'item_id' => (int) $catalogItemId,
            ]);
        }
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $source = $this->input('item_source');
            $itemId = $this->input('item_id');
            $sepaItemId = $this->input('sepa_item_id');

            if ($source === 'local' && empty($itemId)) {
                $validator->errors()->add('item_id', 'Para origen local debe indicar item_id.');
            }

            if ($source === 'sepa' && empty($sepaItemId)) {
                $validator->errors()->add('sepa_item_id', 'Para origen SEPA debe indicar sepa_item_id.');
            }

            if (!empty($itemId) && !empty($sepaItemId)) {
                $validator->errors()->add('item_id', 'Debe enviar item_id o sepa_item_id, no ambos.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'item_id.required_without_all' => 'Debe seleccionar un ítem para agregar.',
            'sepa_item_id.required_without_all' => 'Debe seleccionar un ítem SEPA para agregar.',
            'catalog_item_id.required_without_all' => 'Debe seleccionar un ítem para agregar.',
            'quantity.min' => 'La cantidad mínima es 1.',
        ];
    }
}
