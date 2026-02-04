<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasColor;

class PaymentMethod extends Model
{
    use HasColor;

    protected $fillable = [
        'code', // e.g., 'cash', 'debit', 'mp'
        'name',
        'color', // integer, as per migration
    ];

    public function hides()
    {
        return $this->hasMany(BusinessPaymentMethodHide::class, 'payment_method_id');
    }
}