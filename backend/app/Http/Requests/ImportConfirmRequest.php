<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesBusinessContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ImportConfirmRequest extends FormRequest
{
    use AuthorizesBusinessContext;

    public function authorize(): bool
    {
        return $this->userBelongsToCurrentBusiness();
    }

    public function rules(): array
    {
        $businessId = $this->currentBusinessId();

        return [
            'items' => ['required', 'array'],
            'items.*.name' => ['required', 'string'],
            'items.*.price' => ['nullable', 'numeric', 'min:0', 'required_without:items.*.list_price'],
            'items.*.list_price' => ['nullable', 'numeric', 'min:0', 'required_without:items.*.price'],
            'items.*.barcode' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9\-_.]+$/'],
            'items.*.presentation_quantity' => ['nullable', 'numeric', 'min:0'],
            'items.*.presentation_unit' => ['nullable', 'string', 'max:20'],
            'items.*.brand' => ['nullable', 'string', 'max:120'],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('business_id', $businessId)],
            'sync_by_sku' => ['nullable', 'boolean'],
            'sync_by_barcode' => ['nullable', 'boolean'],
        ];
    }
}
