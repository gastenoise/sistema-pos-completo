<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentMethod extends Model
{
    protected $fillable = [
        'code',
        'name',
        'icon',
        'color',
    ];

    public function hides()
    {
        return $this->hasMany(BusinessPaymentMethodHide::class, 'payment_method_id');
    }
}
