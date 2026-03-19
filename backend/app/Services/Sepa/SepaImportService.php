<?php

namespace App\Services\Sepa;

use App\Models\SepaImportRun;
use App\Models\SepaImportRunFile;
use App\Models\SepaItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use SplFileObject;
use ZipArchive;

class SepaImportService
{
    public const STAGE_PENDING_DOWNLOAD = 'pending_download';
    public const STAGE_DOWNLOADED = 'downloaded';
    public const STAGE_READY_TO_PROCESS = 'ready_to_process';
    public const STAGE_PROCESSING = 'processing';
    public const STAGE_FINALIZING = 'finalizing';
    public const STAGE_SUCCESS = 'success';
    public const STAGE_FAILED = 'failed';

    private const EXPECTED_MIN_COLUMNS = 8;
    private const ERROR_SAMPLE_LIMIT = 10;

    public function __construct(private readonly SepaSourceResolver $sourceResolver)
    {
    }

    public function import(string $day, ?string $requestedDate = null): SepaImportRun
    {
        $run = $this->startRun($day, $requestedDate);

        while ($run->status === 'running' && $run->canAdvance()) {
            $run = $this->advanceRun($run);
        }

        return $run;
    }

    public function startRun(string $day, ?string $requestedDate = null): SepaImportRun
    {
        $startedAt = now();

        return SepaImportRun::create([
            'day' => $day,
            'requested_date' => $requestedDate,
            'status' => 'running',
            'stage' => self::STAGE_PENDING_DOWNLOAD,
            'pipeline_state' => [
                'next_archive_index' => 0,
            ],
            'file_metrics' => [],
            'stage_timestamps' => [
                self::STAGE_PENDING_DOWNLOAD => ['entered_at' => $startedAt->toISOString()],
            ],
            'started_at' => $startedAt,
            'downloaded_files' => 0,
            'valid_rows' => 0,
            'invalid_rows' => 0,
            'inserted_rows' => 0,
            'updated_rows' => 0,
            'total_zip_files' => 0,
            'total_csv_files' => 0,
            'next_file_index' => 0,
        ]);
    }

    public function advanceRun(SepaImportRun $run): SepaImportRun
    {
        $run = $run->fresh();

        return match ($run?->stage) {
            self::STAGE_PENDING_DOWNLOAD => $this->downloadArtifacts($run),
            self::STAGE_DOWNLOADED => $this->discoverInnerArchives($run),
            self::STAGE_READY_TO_PROCESS,
            self::STAGE_PROCESSING => $this->processNextArchive($run),
            self::STAGE_FINALIZING => $this->finalizeRun($run),
            self::STAGE_SUCCESS, self::STAGE_FAILED => $run,
            default => throw new RuntimeException("Etapa de importación SEPA desconocida: {$run->stage}"),
        };
    }

    public function downloadArtifacts(SepaImportRun $run): SepaImportRun
    {
        return $this->runStage($run, [self::STAGE_PENDING_DOWNLOAD], function (SepaImportRun $run, array &$state, array &$metrics): array {
            $url = $this->sourceResolver->resolveUrlForDay($run->day);
            $baseTmpDir = $this->baseTmpDir($run);
            if (!is_dir($baseTmpDir)) {
                mkdir($baseTmpDir, 0775, true);
            }

            $mainZipPath = $run->main_zip_path ?: $baseTmpDir.'/sepa_main.zip';
            $mainExtractDir = $run->main_extract_dir ?: $baseTmpDir.'/main_extracted';

            $this->downloadMainZip($url, $mainZipPath);
            $this->extractZip($mainZipPath, $mainExtractDir);

            $state['main_zip_path'] = $mainZipPath;
            $state['main_extract_dir'] = $mainExtractDir;
            $metrics['downloaded_files'] = max($metrics['downloaded_files'], 1);

            return [
                'stage' => self::STAGE_DOWNLOADED,
                'main_zip_path' => $mainZipPath,
                'main_extract_dir' => $mainExtractDir,
            ];
        });
    }

    public function discoverInnerArchives(SepaImportRun $run): SepaImportRun
    {
        return $this->runStage($run, [self::STAGE_DOWNLOADED], function (SepaImportRun $run, array &$state, array &$metrics): array {
            $mainExtractDir = $run->main_extract_dir ?? $state['main_extract_dir'] ?? null;
            if (!is_string($mainExtractDir) || $mainExtractDir === '') {
                throw new RuntimeException('No existe el directorio temporal del ZIP principal para descubrir archivos internos.');
            }

            $internalDateDir = $this->detectInternalDateDirectory($mainExtractDir);
            $innerZipFiles = array_values($this->listZipFilesSortedBySize($internalDateDir));

            $state['internal_date_dir'] = $internalDateDir;
            $state['inner_zip_files'] = $innerZipFiles;

            $fileMetrics = $run->file_metrics;
            $fileMetrics = is_array($fileMetrics) ? $fileMetrics : [];

            foreach ($innerZipFiles as $index => $zipPath) {
                $this->upsertRunFile($run, $index, $zipPath);
                $fileMetrics[$index] = $fileMetrics[$index] ?? $this->emptyFileMetrics();
            }

            $nextFileIndex = $this->resolveNextFileIndex($run);
            $metrics['downloaded_files'] = count($innerZipFiles) + 1;

            return [
                'stage' => $innerZipFiles === [] ? self::STAGE_FINALIZING : self::STAGE_READY_TO_PROCESS,
                'total_zip_files' => count($innerZipFiles),
                'total_csv_files' => count($innerZipFiles),
                'next_file_index' => $nextFileIndex,
                'file_metrics' => $fileMetrics,
                'pipeline_state' => array_merge($state, ['next_archive_index' => $nextFileIndex]),
            ];
        });
    }

    public function processNextArchive(SepaImportRun $run): SepaImportRun
    {
        return $this->runStage($run, [self::STAGE_READY_TO_PROCESS, self::STAGE_PROCESSING], function (SepaImportRun $run, array &$state, array &$metrics): array {
            $run = $run->fresh(['files']) ?? $run;
            $file = $run->nextPendingFile();

            if ($file === null) {
                return [
                    'stage' => self::STAGE_FINALIZING,
                    'next_file_index' => $run->total_zip_files,
                    'pipeline_state' => array_merge($state, ['next_archive_index' => $run->total_zip_files]),
                ];
            }

            $processingStartedAt = now();
            $this->touchStage($run, self::STAGE_PROCESSING, $processingStartedAt);
            $file->update([
                'status' => 'processing',
                'started_at' => $file->started_at ?? $processingStartedAt,
                'error_message' => null,
            ]);

            $innerExtractDir = $file->extract_dir ?: $this->baseTmpDir($run).'/inner_'.($file->file_index + 1);
            $this->extractZip($file->zip_path, $innerExtractDir);

            $csvPath = $this->findProductosCsv($innerExtractDir);
            $allFileMetrics = is_array($run->file_metrics) ? $run->file_metrics : [];
            $fileMetrics = $this->normalizeFileMetricsEntry($allFileMetrics[$file->file_index] ?? null);

            if ($csvPath === null) {
                $fileMetrics['invalid_rows']++;
                $this->pushErrorSample($metrics['error_samples'], [
                    'zip' => basename($file->zip_path),
                    'error' => 'productos.csv no encontrado',
                ]);
                $this->pushErrorSample($fileMetrics['error_samples'], [
                    'zip' => basename($file->zip_path),
                    'error' => 'productos.csv no encontrado',
                ]);
            } else {
                $this->parseAndUpsertCsv($csvPath, $metrics, $fileMetrics);
            }

            $file->update([
                'extract_dir' => $innerExtractDir,
                'csv_path' => $csvPath,
                'status' => 'done',
                'metrics' => $fileMetrics,
                'finished_at' => now(),
            ]);

            $allFileMetrics[$file->file_index] = $fileMetrics;
            $nextFileIndex = $this->resolveNextFileIndex($run->fresh(['files']) ?? $run);
            $hasPendingFiles = $nextFileIndex < (int) $run->total_zip_files;

            return [
                'stage' => $hasPendingFiles ? self::STAGE_READY_TO_PROCESS : self::STAGE_FINALIZING,
                'next_file_index' => $nextFileIndex,
                'file_metrics' => $allFileMetrics,
                'pipeline_state' => array_merge($state, ['next_archive_index' => $nextFileIndex]),
            ];
        });
    }

    public function finalizeRun(SepaImportRun $run): SepaImportRun
    {
        $run = $run->fresh(['files']) ?? $run;
        if ($run->hasPendingFiles()) {
            throw new RuntimeException('La corrida SEPA todavía tiene archivos pendientes de procesar.');
        }

        $this->touchStage($run, self::STAGE_FINALIZING);

        $run->update([
            'status' => 'success',
            'stage' => self::STAGE_SUCCESS,
            'finished_at' => now(),
            'duration_seconds' => $this->safeDurationSeconds($run->started_at ?? now()),
        ]);

        $run = $run->fresh();
        $this->touchStage($run, self::STAGE_SUCCESS);
        $this->cleanupRunArtifacts($run);

        return $run->fresh();
    }

    private function safeDurationSeconds(Carbon $startedAt): int
    {
        return max(0, (int) $startedAt->diffInSeconds(now(), true));
    }

    /**
     * @param array<int, string> $expectedStages
     * @param callable(SepaImportRun, array<string, mixed>&, array<string, int|array<int, array<string, mixed>>>&): array<string, mixed> $callback
     */
    private function runStage(SepaImportRun $run, array $expectedStages, callable $callback): SepaImportRun
    {
        $run = $run->fresh();
        if ($run === null) {
            throw new RuntimeException('La corrida SEPA no existe.');
        }

        if ($run->status !== 'running') {
            return $run;
        }

        if (!in_array($run->stage, $expectedStages, true)) {
            $expected = implode(', ', $expectedStages);
            throw new RuntimeException("La corrida SEPA #{$run->id} no está en la etapa esperada [{$expected}] sino en [{$run->stage}].");
        }

        $state = $this->pipelineState($run);
        $metrics = $this->metricsFromRun($run);

        try {
            $updates = $callback($run, $state, $metrics);
            $updates['pipeline_state'] = $updates['pipeline_state'] ?? $state;
            $updates['stage_timestamps'] = $this->mergeStageTimestamps($run, $updates['stage'] ?? null);
            $run->update(array_merge($metrics, $updates));
        } catch (\Throwable $exception) {
            $this->markRunAsFailed($run, $exception);
            throw $exception;
        }

        return $run->fresh();
    }

    /**
     * @return array<string, mixed>
     */
    private function pipelineState(SepaImportRun $run): array
    {
        $state = $run->pipeline_state;

        return is_array($state) ? $state : [];
    }

    /**
     * @return array<string, int|array<int, array<string, mixed>>>
     */
    private function metricsFromRun(SepaImportRun $run): array
    {
        return [
            'downloaded_files' => (int) $run->downloaded_files,
            'valid_rows' => (int) $run->valid_rows,
            'invalid_rows' => (int) $run->invalid_rows,
            'inserted_rows' => (int) $run->inserted_rows,
            'updated_rows' => (int) $run->updated_rows,
            'error_samples' => is_array($run->error_samples) ? $run->error_samples : [],
        ];
    }

    private function markRunAsFailed(SepaImportRun $run, \Throwable $exception): void
    {
        $run->update([
            'status' => 'failed',
            'stage' => self::STAGE_FAILED,
            'error_message' => $exception->getMessage(),
            'finished_at' => now(),
            'duration_seconds' => $this->safeDurationSeconds($run->started_at ?? now()),
            'stage_timestamps' => $this->mergeStageTimestamps($run, self::STAGE_FAILED),
        ]);

        $run->files()
            ->where('status', 'processing')
            ->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
                'finished_at' => now(),
            ]);

        $this->cleanupRunArtifacts($run);
    }

    private function cleanupRunArtifacts(SepaImportRun $run): void
    {
        File::deleteDirectory($this->baseTmpDir($run));
    }

    private function baseTmpDir(SepaImportRun $run): string
    {
        return storage_path("app/sepa/tmp/run_{$run->id}");
    }

    protected function downloadMainZip(string $url, string $destinationPath): void
    {
        $response = Http::timeout((int) config('sepa.http_timeout', 120))->get($url);

        if (!$response->successful()) {
            throw new RuntimeException("No se pudo descargar SEPA desde {$url}. Status: {$response->status()}");
        }

        file_put_contents($destinationPath, $response->body());
    }

    protected function extractZip(string $zipPath, string $extractTo): void
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

    protected function detectInternalDateDirectory(string $baseDir): string
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
    protected function listZipFilesSortedBySize(string $directory): array
    {
        $zipFiles = glob($directory.'/*.zip') ?: [];

        usort($zipFiles, static function (string $left, string $right): int {
            return filesize($left) <=> filesize($right);
        });

        return $zipFiles;
    }

    protected function findProductosCsv(string $directory): ?string
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
     * @param array<string, mixed> $fileMetrics
     */
    protected function parseAndUpsertCsv(string $csvPath, array &$metrics, array &$fileMetrics): void
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
                $fileMetrics['invalid_rows']++;
                $sample = [
                    'line' => $lineNumber + 1,
                    'error' => 'Cantidad de columnas insuficiente',
                ];
                $this->pushErrorSample($metrics['error_samples'], $sample);
                $this->pushErrorSample($fileMetrics['error_samples'], $sample);
                continue;
            }

            $record = $this->buildRecord($headers, $row);
            if ($record === null) {
                $metrics['invalid_rows']++;
                $fileMetrics['invalid_rows']++;
                $sample = [
                    'line' => $lineNumber + 1,
                    'error' => 'Fila inválida o barcode faltante',
                ];
                $this->pushErrorSample($metrics['error_samples'], $sample);
                $this->pushErrorSample($fileMetrics['error_samples'], $sample);
                continue;
            }

            $batch[] = $record;
            $metrics['valid_rows']++;
            $fileMetrics['valid_rows']++;

            if (count($batch) >= $chunkSize) {
                $this->persistChunk($batch, $metrics, $fileMetrics);
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
            $this->persistChunk($batch, $metrics, $fileMetrics);
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
     * @param array<string, mixed> $fileMetrics
     */
    protected function persistChunk(array $batch, array &$metrics, array &$fileMetrics): void
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
        $fileMetrics['inserted_rows'] += $inserted;
        $fileMetrics['updated_rows'] += $updated;
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

        if (in_array($normalized, ['litro', 'l'], true)) {
            return 'lt';
        }

        if (in_array($normalized, ['kilo', 'k'], true)) {
            return 'kg';
        }

        if (in_array($normalized, ['cm3', 'cm'], true)) {
            return 'cc';
        }

        if (in_array($normalized, ['pc', 'pk', 'paque'], true)) {
            return 'pck';
        }

        if (in_array($normalized, ['unidad', 'unida', 'pu', 'uni'], true)) {
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
        if (in_array($normalized, ['SIN MARCA', 'S/D', 'GENERICO'], true)) {
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

    private function upsertRunFile(SepaImportRun $run, int $index, string $zipPath): void
    {
        $existing = SepaImportRunFile::query()->firstOrNew([
            'sepa_import_run_id' => $run->id,
            'file_index' => $index,
        ]);

        $existing->fill([
            'zip_path' => $zipPath,
            'status' => $existing->exists ? $existing->status : 'pending',
            'metrics' => $existing->metrics ?? $this->emptyFileMetrics(),
            'error_message' => $existing->status === 'done' ? $existing->error_message : null,
        ]);

        $existing->save();
    }

    private function resolveNextFileIndex(SepaImportRun $run): int
    {
        $pendingFile = $run->nextPendingFile();

        return $pendingFile?->file_index ?? (int) $run->total_zip_files;
    }

    /**
     * @return array<string, int|array<int, array<string, mixed>>>
     */
    private function emptyFileMetrics(): array
    {
        return [
            'valid_rows' => 0,
            'invalid_rows' => 0,
            'inserted_rows' => 0,
            'updated_rows' => 0,
            'error_samples' => [],
        ];
    }

    /**
     * @param mixed $metrics
     * @return array<string, mixed>
     */
    private function normalizeFileMetricsEntry(mixed $metrics): array
    {
        $normalized = is_array($metrics) ? $metrics : [];

        return array_merge($this->emptyFileMetrics(), $normalized, [
            'error_samples' => is_array($normalized['error_samples'] ?? null) ? $normalized['error_samples'] : [],
        ]);
    }

    private function mergeStageTimestamps(SepaImportRun $run, ?string $nextStage): array
    {
        $timestamps = is_array($run->stage_timestamps) ? $run->stage_timestamps : [];
        if ($nextStage === null) {
            return $timestamps;
        }

        $timestamps[$nextStage] = array_merge($timestamps[$nextStage] ?? [], [
            'entered_at' => now()->toISOString(),
        ]);

        return $timestamps;
    }

    private function touchStage(SepaImportRun $run, string $stage, ?Carbon $at = null): void
    {
        $timestamps = is_array($run->stage_timestamps) ? $run->stage_timestamps : [];
        $timestamps[$stage] = array_merge($timestamps[$stage] ?? [], [
            'entered_at' => ($at ?? now())->toISOString(),
        ]);

        $run->forceFill([
            'stage' => $stage,
            'stage_timestamps' => $timestamps,
        ])->save();
    }
}
