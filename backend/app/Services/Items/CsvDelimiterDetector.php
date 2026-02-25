<?php

namespace App\Services\Items;

class CsvDelimiterDetector
{
    private const DEFAULT_DELIMITERS = ['|', ',', ';', "\t"];

    public function allowedDelimiters(): array
    {
        return self::DEFAULT_DELIMITERS;
    }

    public function resolve(?string $requestedDelimiter, string $path): string
    {
        if (is_string($requestedDelimiter) && in_array($requestedDelimiter, self::DEFAULT_DELIMITERS, true)) {
            return $requestedDelimiter;
        }

        return $this->detect($path);
    }

    public function detect(string $path): string
    {
        $file = new \SplFileObject($path, 'r');
        $sampleLines = [];

        while (! $file->eof() && count($sampleLines) < 5) {
            $line = trim((string) $file->fgets());
            if ($line !== '') {
                $sampleLines[] = $line;
            }
        }

        if ($sampleLines === []) {
            return ',';
        }

        $bestDelimiter = ',';
        $bestScore = -1;

        foreach (self::DEFAULT_DELIMITERS as $delimiter) {
            $fieldCounts = array_map(static fn ($line) => count(str_getcsv($line, $delimiter)), $sampleLines);
            $score = 0;

            if ($fieldCounts !== []) {
                $maxCount = max($fieldCounts);
                $minCount = min($fieldCounts);
                $score = $maxCount > 1 ? ($maxCount * 10) - ($maxCount - $minCount) : 0;
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestDelimiter = $delimiter;
            }
        }

        return $bestDelimiter;
    }
}
