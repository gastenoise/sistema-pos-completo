<?php

namespace App\Http\Requests\Concerns;

use App\Rules\ExistsInCurrentBusiness;
use Illuminate\Validation\Rule;

trait HasItemRules
{
    protected function itemRules(bool $partial = false, ?int $itemId = null): array
    {
        $prefix = $partial ? 'sometimes|' : '';

        return [
            'name' => $prefix.'string|max:255',
            'price' => $prefix.'numeric|min:0',
            'category_id' => ['nullable', 'integer', new ExistsInCurrentBusiness('categories')],
            'sku' => $prefix.'nullable|string|max:50',
            'barcode' => [
                $prefix.'nullable',
                'string',
                'max:64',
                'regex:/^[A-Za-z0-9\-_.]+$/',
                Rule::unique('items', 'barcode')
                    ->where('business_id', (int) $this->currentBusinessId())
                    ->ignore($itemId),
            ],
            'presentation_quantity' => $prefix.'nullable|numeric|min:0',
            'presentation_unit' => $prefix.'nullable|string|max:20',
            'brand' => $prefix.'nullable|string|max:120',
            'list_price' => $prefix.'nullable|numeric|min:0',
        ];
    }
}
