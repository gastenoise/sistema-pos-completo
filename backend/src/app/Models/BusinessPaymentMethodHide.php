<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Business;
use App\Models\PaymentMethod;


class BusinessPaymentMethodHide extends Model
{
    protected $table = 'business_payment_method_hides';

    protected $fillable = ['business_id','payment_method_id','hidden_by'];

    public function paymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}