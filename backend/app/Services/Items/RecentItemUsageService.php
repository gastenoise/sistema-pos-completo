<?php

namespace App\Services\Items;

use Illuminate\Support\Facades\Cache;

class RecentItemUsageService
{
    private const TTL_DAYS = 30;
    private const MAX_ITEMS = 200;

    public function record(int $businessId, string $source, int $itemId, int $quantity = 1): void
    {
        if ($itemId <= 0 || !in_array($source, ['local', 'sepa'], true)) {
            return;
        }

        $key = $this->cacheKey($businessId);
        $now = now()->timestamp;
        $qty = max(1, $quantity);

        $stats = Cache::get($key, []);
        $itemKey = $this->itemKey($source, $itemId);
        $entry = $stats[$itemKey] ?? ['score' => 0, 'last_used' => 0];
        $entry['score'] = (int) ($entry['score'] ?? 0) + $qty;
        $entry['last_used'] = $now;
        $stats[$itemKey] = $entry;

        uasort($stats, static function (array $a, array $b): int {
            $scoreCmp = ($b['score'] ?? 0) <=> ($a['score'] ?? 0);
            if ($scoreCmp !== 0) {
                return $scoreCmp;
            }

            return ($b['last_used'] ?? 0) <=> ($a['last_used'] ?? 0);
        });

        $stats = array_slice($stats, 0, self::MAX_ITEMS, true);

        Cache::put($key, $stats, now()->addDays(self::TTL_DAYS));
    }

    /**
     * @return array<int, string>
     */
    public function topKeys(int $businessId, int $limit = 50): array
    {
        $stats = Cache::get($this->cacheKey($businessId), []);
        if (!is_array($stats) || $stats === []) {
            return [];
        }

        return array_slice(array_keys($stats), 0, max(1, $limit));
    }

    private function cacheKey(int $businessId): string
    {
        return "recent_item_usage:{$businessId}";
    }

    private function itemKey(string $source, int $itemId): string
    {
        return "{$source}:{$itemId}";
    }
}
