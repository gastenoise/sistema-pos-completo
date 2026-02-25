<?php

namespace App\Services\Items;

use Illuminate\Support\Facades\Cache;

class CsvPreviewCache
{
    private const IMPORT_PREVIEW_CACHE_PREFIX = 'items_import_preview:';

    public function get(string $previewId): ?array
    {
        $cached = Cache::get($this->key($previewId));

        return is_array($cached) ? $cached : null;
    }

    public function put(string $previewId, array $payload, int $ttlSeconds): void
    {
        Cache::put($this->key($previewId), $payload, now()->addSeconds($ttlSeconds));
    }

    private function key(string $previewId): string
    {
        return self::IMPORT_PREVIEW_CACHE_PREFIX.$previewId;
    }
}
