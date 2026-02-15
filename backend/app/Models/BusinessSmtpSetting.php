<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Casts\EncryptCast;

class BusinessSmtpSetting extends Model
{
    protected $fillable = [
        'business_id',
        'host',
        'port',
        'username',
        'password',
        'encryption',
        'from_email',
        'from_name',
        'active',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'active' => 'boolean',
        'password' => EncryptCast::class,
    ];
}