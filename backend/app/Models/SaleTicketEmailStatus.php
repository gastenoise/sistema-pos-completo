<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaleTicketEmailStatus extends Model
{
    protected $fillable = [
        'request_id',
        'business_id',
        'sale_id',
        'to_email',
        'subject',
        'status',
        'error_message',
        'meta',
        'queued_at',
        'processed_at',
    ];

    protected $casts = [
        'meta' => 'array',
        'queued_at' => 'datetime',
        'processed_at' => 'datetime',
    ];
}
