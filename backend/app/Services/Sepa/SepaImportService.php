<?php

namespace App\Services\Sepa;

use App\Models\SepaImportRun;
use App\Models\SepaItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use SplFileObject;
use ZipArchive;

class SepaImportService
{
    private const EXPECTED_MIN_COLUMNS = 8;
    private const ERROR_SAMPLE_LIMIT = 10;

    public function __construct(private readonly SepaSourceResolver $sourceResolver)
    {
    }

    public function import(string $day, ?string $requestedDate = null): SepaImportRun
    {
        $startedAt = now();

        $run = SepaImportRun::create([
            'day' => $day,
            'requested_date' => $requestedDate,
            'status' => 'running',
            'started_at' => $startedAt,
            'downloaded_files' => 0,
            'valid_rows' => 0,
            'invalid_rows' => 0,
            'inserted_rows' => 0,
            'updated_rows' => 0,
        ]);

        try {
            $metrics = $this->executeImport($day, $run->id);

            $run->update([
                'status' => 'success',
                'downloaded_files' => $metrics['downloaded_files'],
                'valid_rows' => $metrics['valid_rows'],
                'invalid_rows' => $metrics['invalid_rows'],
                'inserted_rows' => $metrics['inserted_rows'],
                'updated_rows' => $metrics['updated_rows'],
                'error_samples' => $metrics['error_samples'],
                'finished_at' => now(),
                'duration_seconds' => $this->safeDurationSeconds($startedAt),
            ]);
        } catch (\Throwable $exception) {
            $run->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
                'finished_at' => now(),
                'duration_seconds' => $this->safeDurationSeconds($startedAt),
            ]);

            throw $exception;
        }

        return $run->fresh();
    }

    private function safeDurationSeconds(Carbon $startedAt): int
    {
        return max(0, (int) $startedAt->diffInSeconds(now(), true));
    }

    /**
     * @return array<string, int|array<int, array<string, mixed>>>
     */
    private function executeImport(string $day, int $runId): array
    {
        $url = $this->sourceResolver->resolveUrlForDay($day);
        $baseTmpDir = storage_path("app/sepa/tmp/run_{$runId}");
        if (!is_dir($baseTmpDir)) {
            mkdir($baseTmpDir, 0775, true);
        }

        $mainZipPath = $baseTmpDir.'/sepa_main.zip';
        $this->downloadMainZip($url, $mainZipPath);

        $mainExtractDir = $baseTmpDir.'/main_extracted';
        $this->extractZip($mainZipPath, $mainExtractDir);

        $internalDateDir = $this->detectInternalDateDirectory($mainExtractDir);
        $innerZipFiles = $this->listZipFilesSortedBySize($internalDateDir);

        $metrics = [
            'downloaded_files' => count($innerZipFiles) + 1,
            'valid_rows' => 0,
            'invalid_rows' => 0,
            'inserted_rows' => 0,
            'updated_rows' => 0,
            'error_samples' => [],
        ];

        foreach ($innerZipFiles as $index => $zipPath) {
            $innerExtractDir = $baseTmpDir.'/inner_'.($index + 1);
            $this->extractZip($zipPath, $innerExtractDir);

            $csvPath = $this->findProductosCsv($innerExtractDir);
            if ($csvPath === null) {
                $this->pushErrorSample($metrics['error_samples'], [
                    'zip' => basename($zipPath),
                    'error' => 'productos.csv no encontrado',
                ]);
                continue;
            }

            $this->parseAndUpsertCsv($csvPath, $metrics);
        }

        return $metrics;
    }

    private function downloadMainZip(string $url, string $destinationPath): void
    {
        $response = Http::timeout((int) config('sepa.http_timeout', 120))->get($url);

        if (!$response->successful()) {
            throw new RuntimeException("No se pudo descargar SEPA desde {$url}. Status: {$response->status()}");
        }

        file_put_contents($destinationPath, $response->body());
    }

    private function extractZip(string $zipPath, string $extractTo): void
    {
        if (!is_dir($extractTo)) {
            mkdir($extractTo, 0775, true);
        }

        $zip = new ZipArchive();
        if ($zip->open($zipPath) !== true) {
            throw new RuntimeException("No se pudo abrir ZIP: {$zipPath}");
        }

        if (!$zip->extractTo($extractTo)) {
            $zip->close();
            throw new RuntimeException("No se pudo extraer ZIP: {$zipPath}");
        }

        $zip->close();
    }

    private function detectInternalDateDirectory(string $baseDir): string
    {
        $directories = array_values(array_filter(glob($baseDir.'/*'), 'is_dir'));

        if ($directories === []) {
            throw new RuntimeException('No se encontró carpeta interna de fecha en el ZIP principal.');
        }

        return $directories[0];
    }

    /**
     * @return array<int, string>
     */
    private function listZipFilesSortedBySize(string $directory): array
    {
        $zipFiles = glob($directory.'/*.zip') ?: [];

        usort($zipFiles, static function (string $left, string $right): int {
            return filesize($left) <=> filesize($right);
        });

        return $zipFiles;
    }

    private function findProductosCsv(string $directory): ?string
    {
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($directory));

        foreach ($iterator as $file) {
            if (!$file->isFile()) {
                continue;
            }

            if (mb_strtolower($file->getFilename()) === 'productos.csv') {
                return $file->getPathname();
            }
        }

        return null;
    }

    /**
     * @param array<string, int|array<int, array<string, mixed>>> $metrics
     */
    private function parseAndUpsertCsv(string $csvPath, array &$metrics): void
    {
        $file = new SplFileObject($csvPath);
        $file->setFlags(SplFileObject::READ_CSV | SplFileObject::DROP_NEW_LINE | SplFileObject::SKIP_EMPTY);
        $file->setCsvControl('|');

        $headers = null;
        $batch = [];
        $chunkSize = max((int) config('sepa.chunk_size', 1000), 1);
        $sampleRows = [];

        foreach ($file as $lineNumber => $row) {
            if (!is_array($row) || $row === [null] || $row === false) {
                continue;
            }

            $row = array_map(static fn ($value) => is_string($value) ? trim($value) : $value, $row);

            if ($headers === null) {
                $headers = $this->normalizeHeaders($row);
                continue;
            }

            if (count($sampleRows) < 2) {
                $sampleRows[] = $row;
            }

            if (count($row) < self::EXPECTED_MIN_COLUMNS) {
                $metrics['invalid_rows']++;
                $this->pushErrorSample($metrics['error_samples'], [
                    'line' => $lineNumber + 1,
                    'error' => 'Cantidad de columnas insuficiente',
                ]);
                continue;
            }

            $record = $this->buildRecord($headers, $row);
            if ($record === null) {
                $metrics['invalid_rows']++;
                $this->pushErrorSample($metrics['error_samples'], [
                    'line' => $lineNumber + 1,
                    'error' => 'Fila inválida o barcode faltante',
                ]);
                continue;
            }

            $batch[] = $record;
            $metrics['valid_rows']++;

            if (count($batch) >= $chunkSize) {
                $this->persistChunk($batch, $metrics);
                $batch = [];
            }
        }

        if ($headers !== null) {
            Log::info('SEPA productos.csv sample rows', [
                'csv' => $csvPath,
                'header' => $headers,
                'row_1' => $sampleRows[0] ?? null,
                'row_2' => $sampleRows[1] ?? null,
            ]);
        }

        if ($batch !== []) {
            $this->persistChunk($batch, $metrics);
        }
    }

    /**
     * @param array<int, string> $headers
     * @param array<int, string|null> $row
     */
    private function buildRecord(array $headers, array $row): ?array
    {
        $item = [];
        foreach ($headers as $index => $header) {
            $item[$header] = $row[$index] ?? null;
        }

        $barcode = $this->resolveBarcode($item);
        if ($barcode === null) {
            return null;
        }

        $isBultoFormat = array_key_exists('precio_unitario_bulto_por_unidad_venta_con_iva', $item);

        $price = $isBultoFormat
            ? $this->normalizeDecimal($item['precio_unitario_bulto_por_unidad_venta_con_iva'] ?? null)
            : $this->normalizeDecimal($item['productos_precio_lista'] ?? $item['productos_precio_vta1'] ?? null);

        $listPrice = $isBultoFormat
            ? $this->normalizeDecimal($item['precio_unitario_bulto_por_unidad_venta_con_iva'] ?? null)
            : $this->normalizeDecimal($item['productos_precio_lista'] ?? null);

        $presentationQuantity = null;
        $presentationUnit = null;

        if (!$isBultoFormat) {
            $presentationQuantity = $this->normalizeDecimal(
                $item['productos_cantidad_presentacion']
                    ?? $item['productos_contenido_neto']
                    ?? null
            );
            $presentationUnit = $this->normalizePresentationUnit($item['productos_unidad_medida_presentacion'] ?? null);
        }

        $now = Carbon::now();

        return [
            'name' => $this->normalizeString($item['productos_descripcion'] ?? null, 255) ?? 'SIN NOMBRE',
            'barcode' => $barcode,
            'price' => $price ?? 0,
            'presentation_quantity' => $presentationQuantity,
            'presentation_unit' => $presentationUnit,
            'brand' => $this->normalizeBrand($item['productos_marca'] ?? null),
            'list_price' => $listPrice,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $batch
     * @param array<string, int|array<int, array<string, mixed>>> $metrics
     */
    private function persistChunk(array $batch, array &$metrics): void
    {
        $barcodes = array_column($batch, 'barcode');
        $existingRows = SepaItem::query()
            ->whereIn('barcode', $barcodes)
            ->get(['barcode', 'presentation_quantity', 'presentation_unit'])
            ->keyBy('barcode');

        $inserted = 0;
        $updated = 0;
        foreach ($batch as &$record) {
            $existing = $existingRows->get($record['barcode']);
            if ($existing) {
                $updated++;
                $hasCompletePresentation = $record['presentation_quantity'] !== null && $record['presentation_unit'] !== null;
                if (!$hasCompletePresentation) {
                    $record['presentation_quantity'] = $existing->presentation_quantity;
                    $record['presentation_unit'] = $existing->presentation_unit;
                }
            } else {
                $inserted++;
            }
        }
        unset($record);

        DB::transaction(static function () use ($batch): void {
            DB::table('sepa_items')->upsert(
                $batch,
                ['barcode'],
                ['name', 'price', 'presentation_quantity', 'presentation_unit', 'brand', 'list_price', 'updated_at']
            );
        });

        $metrics['inserted_rows'] += $inserted;
        $metrics['updated_rows'] += $updated;
    }

    /**
     * @param array<int, string|null> $row
     * @return array<int, string>
     */
    private function normalizeHeaders(array $row): array
    {
        return array_map(static function ($header): string {
            return mb_strtolower(trim((string) $header));
        }, $row);
    }

    /**
     * @param array<string, mixed> $item
     */
    private function resolveBarcode(array $item): ?string
    {
        $primary = $this->normalizeBarcode($item['id_producto'] ?? null);
        if ($primary !== null && !in_array($primary, ['0', '1'], true)) {
            return $primary;
        }

        $fallback = $this->normalizeBarcode($item['productos_ean'] ?? null);
        if ($fallback === null) {
            return null;
        }

        $idProducto = $this->normalizeBarcode($item['id_producto'] ?? null);
        if ($fallback !== null && in_array($fallback, ['0', '1'], true) && $idProducto !== null) {
            return $idProducto;
        }

        return $fallback;
    }

    private function normalizeString(mixed $value, int $maxLength): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }

        $normalized = preg_replace('/\s+/', ' ', trim((string) $value));

        if ($normalized === null || $normalized === '') {
            return null;
        }

        return mb_substr($normalized, 0, $maxLength);
    }

    private function normalizeBarcode(mixed $value): ?string
    {
        $barcode = $this->normalizeString($value, 64);
        if ($barcode === null) {
            return null;
        }

        $barcode = preg_replace('/\D+/', '', $barcode) ?? '';

        return $barcode !== '' ? $barcode : null;
    }

    private function normalizePresentationUnit(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }

        $normalized = mb_strtolower(trim((string) $value));
        if ($normalized === '') {
            return null;
        }

        $normalized = preg_replace('/[^\p{L}\p{N}]+/u', '', $normalized) ?? '';
        if ($normalized === '') {
            return null;
        }

        if (in_array($normalized, ['unidad', 'unida', 'pu'], true)) {
            return 'un';
        }

        return mb_substr($normalized, 0, 20);
    }

    private function normalizeBrand(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }

        $normalized = preg_replace('/\s+/', ' ', trim((string) $value));
        if ($normalized === null || $normalized === '') {
            return null;
        }

        $normalized = mb_strtoupper($normalized);
        if ($normalized === 'SIN MARCA') {
            return null;
        }

        return mb_substr($normalized, 0, 120);
    }

    private function normalizeDecimal(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            return round((float) $value, 2);
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }

        $hasDot = str_contains($raw, '.');
        $hasComma = str_contains($raw, ',');

        if ($hasDot && $hasComma) {
            $lastDot = strrpos($raw, '.');
            $lastComma = strrpos($raw, ',');
            if ($lastDot !== false && $lastComma !== false && $lastDot > $lastComma) {
                $raw = str_replace(',', '', $raw);
            } else {
                $raw = str_replace('.', '', $raw);
                $raw = str_replace(',', '.', $raw);
            }
        } elseif ($hasComma) {
            $raw = str_replace(',', '.', $raw);
        }

        $normalized = preg_replace('/[^0-9\.-]/', '', $raw) ?? '';
        if ($normalized === '' || !is_numeric($normalized)) {
            return null;
        }

        return round((float) $normalized, 2);
    }

    /**
     * @param array<int, array<string, mixed>> $samples
     * @param array<string, mixed> $sample
     */
    private function pushErrorSample(array &$samples, array $sample): void
    {
        if (count($samples) >= self::ERROR_SAMPLE_LIMIT) {
            return;
        }

        $samples[] = $sample;
        Log::warning('SEPA fila inválida', $sample);
    }
}
