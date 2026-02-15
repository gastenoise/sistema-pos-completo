<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankAccount extends Model
{
    protected $fillable = [
        'business_id',
        'cbu',
        'alias',
        'bank_name',
        'account_holder_name',
    ];

    /**
     * Una cuenta bancaria pertenece a un negocio.
     */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
