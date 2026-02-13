<?php

namespace App\Rules;

use App\Services\BusinessContext;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

class ExistsInCurrentBusiness implements ValidationRule
{
    public function __construct(
        private readonly string $table,
        private readonly string $column = 'id',
        private readonly string $businessColumn = 'business_id',
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        if (!$businessId) {
            $fail('Business context is required.');

            return;
        }

        $exists = DB::table($this->table)
            ->where($this->column, $value)
            ->where($this->businessColumn, $businessId)
            ->exists();

        if (!$exists) {
            $fail("The selected {$attribute} is invalid for the current business.");
        }
    }
}
