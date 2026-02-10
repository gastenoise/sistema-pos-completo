<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;

class PaymentWebhookEvent extends Model
{
    protected $fillable = [
        'event_id',
        'event_type',
        'payload',
        'processed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'processed_at' => 'datetime',
    ];

    public static function createIfNotExists(string $eventId, array $payload, ?string $eventType): bool
    {
        try {
            static::create([
                'event_id' => $eventId,
                'event_type' => $eventType,
                'payload' => $payload,
                'processed_at' => now(),
            ]);

            return true;
        } catch (QueryException $exception) {
            if ((string) $exception->getCode() === '23000') {
                return false;
            }

            throw $exception;
        }
    }
}
