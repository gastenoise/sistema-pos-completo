<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashRegisterExpectedTotal extends Model
{
    // No usa HasBusiness directamente porque depende de CashRegisterSession 
    // que ya está filtrada por negocio.

    public $timestamps = false;
    
    protected $fillable = [
        'cash_register_session_id',
        'payment_method_id',
        'expected_amount'
    ];

    protected $casts = [
        'expected_amount' => 'decimal:2',
    ];

    public function session()
    {
        return $this->belongsTo(CashRegisterSession::class, 'cash_register_session_id');
    }

    public function paymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class);
    }
}
