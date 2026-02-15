<?php

namespace App\Http\Controllers;

use App\Actions\Items\BulkUpdateItemsAction;
use App\Actions\Items\ImportItemsAction;
use App\Http\Requests\ItemStoreRequest;
use App\Http\Requests\ItemUpdateRequest;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Services\BusinessContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ItemController extends Controller
{
    private const IMPORT_PREVIEW_CACHE_PREFIX = 'items_import_preview:';
    private const IMPORT_PREVIEW_CACHE_TTL_SECONDS = 3600;
    private const DEFAULT_DELIMITERS = ['|', ',', ';', "\t"];

    private function resolveDelimiter(?string $requestedDelimiter, string $path): string
    {
        if (is_string($requestedDelimiter) && in_array($requestedDelimiter, self::DEFAULT_DELIMITERS, true)) {
            return $requestedDelimiter;
        }

        return $this->detectDelimiter($path);
    }

    private function detectDelimiter(string $path): string
    {
        $file = new \SplFileObject($path, 'r');
        $sampleLines = [];

        while (!$file->eof() && count($sampleLines) < 5) {
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

    private function parseCsvFile(string $path, string $delimiter, bool $lowerCaseHeaders = true): array
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

        foreach ($file as $index => $row) {
            if (!is_array($row) || $row === [null]) {
                continue;
            }

            $lineNumber = $index + 1;
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

    private function getCsvRowsPage(string $path, string $delimiter, array $columns, int $page, int $perPage): array
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

        foreach ($file as $row) {
            if (!is_array($row) || $row === [null] || count($row) !== $headerCount) {
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


    private function buildImportEstimateFromRows(array $rows, int $businessId, ImportItemsAction $importItemsAction): array
    {
        return $importItemsAction->estimateMetrics($rows, $businessId, true, false);
    }

    private function getAllCsvRows(string $path, string $delimiter, array $columns): array
    {
        if ($columns === []) {
            return [];
        }

        $rows = [];
        $file = $this->getCsvStreamIterator($path, $delimiter);
        $file->fgetcsv();
        $headerCount = count($columns);

        foreach ($file as $row) {
            if (!is_array($row) || $row === [null] || count($row) !== $headerCount) {
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

    private function persistImportPreviewFile(Request $request): string
    {
        $previewId = (string) Str::uuid();
        $extension = $request->file('file')->getClientOriginalExtension() ?: 'csv';
        $directory = 'tmp/items-import-previews';
        $filename = sprintf('%s.%s', $previewId, $extension);
        $storedPath = $request->file('file')->storeAs($directory, $filename, 'local');

        return $storedPath;
    }

    public function index(Request $request)
    {
        $query = Item::query();

        if ($request->has('active')) {
            $query->where('active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->filled('category')) {
            if ($request->category === 'uncategorized') {
                $query->whereNull('category_id');
            } else {
                $query->where('category_id', $request->category);
            }
        }
        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('sku', 'like', "%{$term}%")
                    ->orWhere('barcode', 'like', "%{$term}%");
            });
        }

        $perPage = (int) $request->input('per_page', 20);
        $perPage = $perPage > 0 ? min($perPage, 100) : 20;

        return response()->json(['success' => true, 'data' => ItemResource::collection($query->paginate($perPage))]);
    }

    public function store(ItemStoreRequest $request)
    {
        $validated = $request->validated();

        $item = Item::create($validated);
        return response()->json(['success' => true, 'data' => new ItemResource($item)], 201);
    }

    public function show(Item $item)
    {
        return response()->json(['success' => true, 'data' => new ItemResource($item)]);
    }

    public function update(ItemUpdateRequest $request, Item $item)
    {
        $validated = $request->validated();

        $item->update($validated);
        return response()->json(['success' => true, 'data' => new ItemResource($item)]);
    }

    public function bulkUpdate(Request $request, BulkUpdateItemsAction $bulkUpdateItemsAction)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['integer', 'distinct'],
            'operation' => ['required', Rule::in(['set_category', 'set_price', 'adjust_price', 'set_active'])],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('business_id', $businessId)],
            'price' => ['nullable', 'numeric', 'min:0'],
            'price_delta' => ['nullable', 'numeric'],
            'active' => ['nullable', 'boolean'],
        ]);

        $operation = $validated['operation'];

        if ($operation === 'set_category' && !array_key_exists('category_id', $validated)) {
            return response()->json(['success' => false, 'message' => 'category_id is required for set_category operation.'], 422);
        }
        if ($operation === 'set_price' && !array_key_exists('price', $validated)) {
            return response()->json(['success' => false, 'message' => 'price is required for set_price operation.'], 422);
        }
        if ($operation === 'adjust_price' && !array_key_exists('price_delta', $validated)) {
            return response()->json(['success' => false, 'message' => 'price_delta is required for adjust_price operation.'], 422);
        }
        if ($operation === 'set_active' && !array_key_exists('active', $validated)) {
            return response()->json(['success' => false, 'message' => 'active is required for set_active operation.'], 422);
        }

        $result = $bulkUpdateItemsAction->execute($validated);

        return response()->json(['success' => true, 'data' => $result]);
    }

    public function importPreview(Request $request, ImportItemsAction $importItemsAction)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048',
            'delimiter' => ['nullable', Rule::in(self::DEFAULT_DELIMITERS)],
            'lowercase_headers' => 'nullable|boolean',
        ]);

        $storedPath = $this->persistImportPreviewFile($request);
        $absolutePath = Storage::disk('local')->path($storedPath);
        $delimiter = $this->resolveDelimiter($validated['delimiter'] ?? null, $absolutePath);
        $lowerCaseHeaders = $request->boolean('lowercase_headers', true);

        $parsed = $this->parseCsvFile($absolutePath, $delimiter, $lowerCaseHeaders);
        $previewId = pathinfo($storedPath, PATHINFO_FILENAME);

        $estimatedMetrics = null;

        if (in_array('barcode', $parsed['columns'], true)) {
            $allRows = $this->getAllCsvRows($absolutePath, $delimiter, $parsed['columns']);
            $estimatedMetrics = $this->buildImportEstimateFromRows($allRows, app(BusinessContext::class)->getBusinessId(), $importItemsAction);
        }

        Cache::put(self::IMPORT_PREVIEW_CACHE_PREFIX . $previewId, [
            'path' => $storedPath,
            'delimiter' => $delimiter,
            'lowercase_headers' => $lowerCaseHeaders,
            'columns' => $parsed['columns'],
            'sample' => $parsed['sample'],
            'total_rows' => $parsed['total_rows'],
            'parsing_errors' => $parsed['parsing_errors'],
            'estimated_metrics' => $estimatedMetrics,
        ], now()->addSeconds(self::IMPORT_PREVIEW_CACHE_TTL_SECONDS));


        return response()->json([
            'success' => true,
            'data' => [
                'columns' => $parsed['columns'],
                'sample' => $parsed['sample'],
                'total_rows' => $parsed['total_rows'],
                'parsing_errors' => $parsed['parsing_errors'],
                'preview_id' => $previewId,
                'delimiter' => $delimiter,
                'estimated_metrics' => $estimatedMetrics,
            ],
        ]);
    }

    public function importPreviewFull(Request $request, ImportItemsAction $importItemsAction)
    {
        $request->validate([
            'file' => 'nullable|file|mimes:csv,txt|max:2048',
            'preview_id' => 'nullable|string',
            'delimiter' => ['nullable', Rule::in(self::DEFAULT_DELIMITERS)],
            'lowercase_headers' => 'nullable|boolean',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:500',
        ]);

        $cachePayload = null;
        $storedPath = null;
        $previewId = $request->input('preview_id');

        if ($previewId) {
            $cachePayload = Cache::get(self::IMPORT_PREVIEW_CACHE_PREFIX . $previewId);
            $storedPath = $cachePayload['path'] ?? null;
        }

        if (!$storedPath && $request->hasFile('file')) {
            $storedPath = $this->persistImportPreviewFile($request);
            $previewId = pathinfo($storedPath, PATHINFO_FILENAME);
        }

        if (!$storedPath) {
            return response()->json(['success' => false, 'message' => 'Provide preview_id or file for import preview.'], 422);
        }

        $absolutePath = Storage::disk('local')->path($storedPath);
        $delimiter = $this->resolveDelimiter(
            $request->input('delimiter') ?? ($cachePayload['delimiter'] ?? null),
            $absolutePath
        );
        $lowerCaseHeaders = $request->has('lowercase_headers')
            ? $request->boolean('lowercase_headers')
            : (bool) ($cachePayload['lowercase_headers'] ?? true);

        $parsedMetadata = [
            'columns' => $cachePayload['columns'] ?? null,
            'sample' => $cachePayload['sample'] ?? null,
            'total_rows' => $cachePayload['total_rows'] ?? null,
            'parsing_errors' => $cachePayload['parsing_errors'] ?? null,
            'estimated_metrics' => $cachePayload['estimated_metrics'] ?? null,
        ];

        if (!is_array($parsedMetadata['columns']) || !is_array($parsedMetadata['sample']) || !is_int($parsedMetadata['total_rows']) || !is_array($parsedMetadata['parsing_errors'])) {
            $parsedMetadata = $this->parseCsvFile($absolutePath, $delimiter, $lowerCaseHeaders);
        }

        Cache::put(self::IMPORT_PREVIEW_CACHE_PREFIX . $previewId, [
            'path' => $storedPath,
            'delimiter' => $delimiter,
            'lowercase_headers' => $lowerCaseHeaders,
            'columns' => $parsedMetadata['columns'],
            'sample' => $parsedMetadata['sample'],
            'total_rows' => $parsedMetadata['total_rows'],
            'parsing_errors' => $parsedMetadata['parsing_errors'],
            'estimated_metrics' => $parsedMetadata['estimated_metrics'] ?? null,
        ], now()->addSeconds(self::IMPORT_PREVIEW_CACHE_TTL_SECONDS));

        if (!is_array($parsedMetadata['estimated_metrics']) && in_array('barcode', $parsedMetadata['columns'], true)) {
            $allRows = $this->getAllCsvRows($absolutePath, $delimiter, $parsedMetadata['columns']);
            $parsedMetadata['estimated_metrics'] = $this->buildImportEstimateFromRows($allRows, app(BusinessContext::class)->getBusinessId(), $importItemsAction);
        }

        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 100);
        $rows = $this->getCsvRowsPage($absolutePath, $delimiter, $parsedMetadata['columns'], $page, $perPage);
        $total = $parsedMetadata['total_rows'];

        return response()->json([
            'success' => true,
            'data' => [
                'columns' => $parsedMetadata['columns'],
                'rows' => $rows,
                'sample' => $parsedMetadata['sample'],
                'total_rows' => $total,
                'parsing_errors' => $parsedMetadata['parsing_errors'],
                'preview_id' => $previewId,
                'delimiter' => $delimiter,
                'estimated_metrics' => $parsedMetadata['estimated_metrics'] ?? null,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'last_page' => $total > 0 ? (int) ceil($total / $perPage) : 1,
                ],
            ],
        ]);
    }

    public function importConfirm(Request $request, ImportItemsAction $importItemsAction)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.name' => 'required|string',
            'items.*.price' => 'nullable|numeric|min:0|required_without:items.*.list_price',
            'items.*.list_price' => 'nullable|numeric|min:0|required_without:items.*.price',
            'items.*.barcode' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9\-_.]+$/'],
            'items.*.presentation_quantity' => 'nullable|numeric|min:0',
            'items.*.presentation_unit' => 'nullable|string|max:20',
            'items.*.brand' => 'nullable|string|max:120',
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('business_id', $businessId)],
            'sync_by_sku' => 'boolean',
            'sync_by_barcode' => 'boolean',
        ]);

        try {
            $estimatedMetrics = $importItemsAction->estimateMetrics(
                $validated['items'],
                $businessId,
                $request->boolean('sync_by_barcode', true),
                $request->boolean('sync_by_sku')
            );

            $result = $importItemsAction->execute(
                $validated['items'],
                $request->boolean('sync_by_sku'),
                $businessId,
                $request->boolean('sync_by_barcode', true),
                $validated['category_id'] ?? null
            );

            return response()->json(['success' => true, 'data' => $result + ['estimated_metrics' => $estimatedMetrics]]);
        } catch (\Throwable $exception) {
            return response()->json(['success' => false, 'message' => $exception->getMessage()], 500);
        }
    }
}
