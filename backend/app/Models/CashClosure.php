<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasBusiness;

class CashClosure extends Model
{
    use HasBusiness;

    protected $fillable = [
        'business_id',
        'cash_register_session_id',
        'expected_cash',
        'real_cash',
        'difference',
        'created_by'
    ];

    protected $casts = [
        'expected_cash' => 'decimal:2',
        'real_cash' => 'decimal:2',
        'difference' => 'decimal:2',
    ];

    public function session()
    {
        return $this->belongsTo(CashRegisterSession::class, 'cash_register_session_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}