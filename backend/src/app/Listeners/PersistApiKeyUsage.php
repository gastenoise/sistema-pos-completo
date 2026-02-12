<?php

namespace App\Listeners;

use App\Events\ApiKeyAuthenticated;
use App\Models\ApiKey;
use Illuminate\Contracts\Queue\ShouldQueue;

class PersistApiKeyUsage implements ShouldQueue
{
    public function handle(ApiKeyAuthenticated $event): void
    {
        $throttleMinutes = max(0, (int) config('services.api_keys.last_used_at_throttle_minutes', 5));

        ApiKey::query()
            ->whereKey($event->apiKeyId)
            ->where(function ($query) use ($throttleMinutes) {
                $query->whereNull('last_used_at');

                if ($throttleMinutes > 0) {
                    $query->orWhere('last_used_at', '<=', now()->subMinutes($throttleMinutes));
                }
            })
            ->update(['last_used_at' => now()]);
    }
}
