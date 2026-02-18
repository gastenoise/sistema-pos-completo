<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesBusinessContext;
use Illuminate\Foundation\Http\FormRequest;

class SaleStartRequest extends FormRequest
{
    use AuthorizesBusinessContext;

    public function authorize(): bool
    {
        return $this->userBelongsToCurrentBusiness();
    }

    public function rules(): array
    {
        return [
            'cash_register_session_id' => 'nullable|integer|exists:cash_register_sessions,id',
            'items' => 'required|array|min:1',
            'items.*.item_source' => 'nullable|in:local,sepa',
            'items.*.item_id' => 'nullable|integer|exists:items,id',
            'items.*.sepa_item_id' => 'nullable|integer|exists:sepa_items,id',
            'items.*.catalog_item_id' => 'nullable|string|max:64',
            'items.*.quick_item_name' => 'nullable|string|max:255',
            'items.*.quick_item_price' => 'nullable|numeric|min:0|required_with:items.*.quick_item_name',
            'items.*.quick_item_category_id' => 'nullable|integer|exists:categories,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price_override' => 'nullable|numeric|min:0',
            'payments' => 'required|array|min:1',
            'payments.*.payment_method_id' => 'required|integer|exists:payment_methods,id',
            'payments.*.amount' => 'required|numeric|min:0.01',
            'payments.*.transaction_reference' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Debe incluir al menos un ítem para iniciar la venta.',
            'payments.required' => 'Debe incluir al menos un pago para iniciar la venta.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $items = $this->input('items', []);

        if (!is_array($items)) {
            return;
        }

        $normalized = array_map(function ($rawItem) {
            if (!is_array($rawItem)) {
                return $rawItem;
            }

            $catalogItemId = $rawItem['catalog_item_id'] ?? null;

            if (!is_string($catalogItemId) || $catalogItemId === '') {
                return $rawItem;
            }

            $source = $rawItem['item_source'] ?? null;

            if (preg_match('/^(local|sepa):(\d+)$/', $catalogItemId, $matches) === 1) {
                $source = $matches[1];
                $id = (int) $matches[2];
                $rawItem['item_source'] = $source;
                $rawItem[$source === 'sepa' ? 'sepa_item_id' : 'item_id'] = $id;

                return $rawItem;
            }

            if (is_numeric($catalogItemId) && in_array($source, ['local', 'sepa'], true)) {
                $rawItem[$source === 'sepa' ? 'sepa_item_id' : 'item_id'] = (int) $catalogItemId;
            }

            return $rawItem;
        }, $items);

        $this->merge(['items' => $normalized]);
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $items = $this->input('items', []);

            foreach ($items as $index => $rawItem) {
                if (!is_array($rawItem)) {
                    continue;
                }

                $hasQuickItem = !empty($rawItem['quick_item_name']);
                $hasItemId = !empty($rawItem['item_id']);
                $hasSepaItemId = !empty($rawItem['sepa_item_id']);

                if (!$hasQuickItem && !$hasItemId && !$hasSepaItemId) {
                    $validator->errors()->add("items.{$index}.item_id", 'Debe indicar un ítem del catálogo o un ítem rápido.');
                }

                if ($hasQuickItem && ($hasItemId || $hasSepaItemId)) {
                    $validator->errors()->add("items.{$index}.quick_item_name", 'No puede mezclar ítem rápido e ítem de catálogo en la misma línea.');
                }

                if ($hasItemId && $hasSepaItemId) {
                    $validator->errors()->add("items.{$index}.item_id", 'Debe enviar item_id o sepa_item_id, no ambos.');
                }

                if (($rawItem['item_source'] ?? null) === 'local' && !$hasItemId) {
                    $validator->errors()->add("items.{$index}.item_id", 'Para origen local debe indicar item_id.');
                }

                if (($rawItem['item_source'] ?? null) === 'sepa' && !$hasSepaItemId) {
                    $validator->errors()->add("items.{$index}.sepa_item_id", 'Para origen SEPA debe indicar sepa_item_id.');
                }
            }
        });
    }
}
