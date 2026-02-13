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
            'items.*.item_id' => 'nullable|integer|exists:items,id|required_without:items.*.quick_item_name',
            'items.*.quick_item_name' => 'nullable|string|max:255|required_without:items.*.item_id',
            'items.*.quick_item_price' => 'nullable|numeric|min:0|required_with:items.*.quick_item_name',
            'items.*.quick_item_type' => 'nullable|in:product,service,fee|required_with:items.*.quick_item_name',
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
}
