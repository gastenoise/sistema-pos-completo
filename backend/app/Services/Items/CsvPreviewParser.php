<?php

namespace App\Services\Items;

class CsvPreviewParser
{
    private function normalizeHeader(array $header, bool $lowerCase = true): array
    {
        return array_map(static function ($column) use ($lowerCase) {
            $normalized = trim((string) $column);

            return $lowerCase ? mb_strtolower($normalized) : $normalized;
        }, $header);
    }

    private function getCsvStreamIterator(string $path, string $delimiter): \SplFileObject
    {
        $file = new \SplFileObject($path, 'r');
        $file->setFlags(\SplFileObject::READ_CSV | \SplFileObject::SKIP_EMPTY | \SplFileObject::DROP_NEW_LINE);
        $file->setCsvControl($delimiter);

        return $file;
    }

    public function parseMetadata(string $path, string $delimiter, bool $lowerCaseHeaders = true): array
    {
        $file = $this->getCsvStreamIterator($path, $delimiter);
        $header = $file->fgetcsv();
        $normalizedHeader = $this->normalizeHeader(is_array($header) ? $header : [], $lowerCaseHeaders);

        if ($normalizedHeader === [null] || $normalizedHeader === []) {
            return [
                'columns' => [],
                'sample' => [],
                'total_rows' => 0,
                'parsing_errors' => [],
            ];
        }

        $sample = [];
        $parsingErrors = [];
        $totalRows = 0;
        $headerCount = count($normalizedHeader);
        $lineNumber = 1;

        while (! $file->eof()) {
            $row = $file->fgetcsv();
            $lineNumber++;

            if (! is_array($row) || $row === [null]) {
                continue;
            }

            if (count($row) !== $headerCount) {
                $parsingErrors[] = [
                    'line' => $lineNumber,
                    'message' => sprintf(
                        'Column count mismatch at line %d: expected %d, got %d.',
                        $lineNumber,
                        $headerCount,
                        count($row)
                    ),
                ];

                continue;
            }

            $combined = array_combine($normalizedHeader, $row);
            if ($combined === false) {
                $parsingErrors[] = [
                    'line' => $lineNumber,
                    'message' => sprintf('Unable to parse CSV row at line %d.', $lineNumber),
                ];

                continue;
            }

            $totalRows++;
            if (count($sample) < 5) {
                $sample[] = $combined;
            }
        }

        return [
            'columns' => $normalizedHeader,
            'sample' => $sample,
            'total_rows' => $totalRows,
            'parsing_errors' => $parsingErrors,
        ];
    }

    public function getRowsPage(string $path, string $delimiter, array $columns, int $page, int $perPage): array
    {
        if ($columns === []) {
            return [];
        }

        $targetStart = ($page - 1) * $perPage;
        $targetEnd = $targetStart + $perPage;
        $rows = [];

        $file = $this->getCsvStreamIterator($path, $delimiter);
        $file->fgetcsv();
        $validRowIndex = 0;
        $headerCount = count($columns);

        while (! $file->eof()) {
            $row = $file->fgetcsv();

            if (! is_array($row) || $row === [null] || count($row) !== $headerCount) {
                continue;
            }

            $combined = array_combine($columns, $row);
            if ($combined === false) {
                continue;
            }

            if ($validRowIndex >= $targetStart && $validRowIndex < $targetEnd) {
                $rows[] = $combined;
            }

            $validRowIndex++;

            if ($validRowIndex >= $targetEnd) {
                break;
            }
        }

        return $rows;
    }

    public function getAllRows(string $path, string $delimiter, array $columns): array
    {
        if ($columns === []) {
            return [];
        }

        $rows = [];
        $file = $this->getCsvStreamIterator($path, $delimiter);
        $file->fgetcsv();
        $headerCount = count($columns);

        while (! $file->eof()) {
            $row = $file->fgetcsv();

            if (! is_array($row) || $row === [null] || count($row) !== $headerCount) {
                continue;
            }

            $combined = array_combine($columns, $row);
            if ($combined === false) {
                continue;
            }

            $rows[] = $combined;
        }

        return $rows;
    }
}
