<?php

namespace App\Http\Requests\Concerns;

use App\Rules\ExistsInCurrentBusiness;

trait HasItemRules
{
    protected function itemRules(bool $partial = false): array
    {
        $prefix = $partial ? 'sometimes|' : '';

        return [
            'name' => $prefix.'string|max:255',
            'price' => $prefix.'numeric|min:0',
            'type' => $partial ? 'sometimes|in:product,service,fee' : 'required|in:product,service,fee',
            'category_id' => ['nullable', 'integer', new ExistsInCurrentBusiness('categories')],
            'sku' => $prefix.'nullable|string|max:50',
            'presentation_quantity' => $prefix.'nullable|numeric|min:0',
            'presentation_unit' => $prefix.'nullable|string|max:20',
            'brand' => $prefix.'nullable|string|max:120',
            'list_price' => $prefix.'nullable|numeric|min:0',
            'active' => $partial ? 'sometimes|boolean' : 'sometimes|boolean',
        ];
    }
}
