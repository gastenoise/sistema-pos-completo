<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DollarRate extends Model
{
    protected $fillable = ['date', 'rate', 'source'];

    protected $casts = [
        'date' => 'date',
        'rate' => 'decimal:2',
    ];
}