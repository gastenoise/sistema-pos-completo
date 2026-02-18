<?php

namespace App\Services\Sepa;

use Illuminate\Support\Arr;
use InvalidArgumentException;

class SepaSourceResolver
{
    /**
     * @return array<string, string|null>
     */
    public function all(): array
    {
        return config('sepa.day_urls', []);
    }

    /**
     * @return array<int, string>
     */
    public function supportedDays(): array
    {
        return array_keys($this->all());
    }

    public function resolveUrlForDay(string $day): string
    {
        $normalized = mb_strtolower(trim($day));
        $url = Arr::get($this->all(), $normalized);

        if (!is_string($url) || trim($url) === '') {
            throw new InvalidArgumentException("No hay URL configurada para el día [{$normalized}].");
        }

        return $url;
    }
}
