<?php

namespace App\Http\Controllers;

use App\Actions\Items\BuildImportEstimateAction;
use App\Actions\Items\BulkUpdateItemsAction;
use App\Actions\Items\ImportItemsAction;
use App\Actions\Items\UpsertSepaItemBusinessPriceAction;
use App\Http\Requests\ImportConfirmRequest;
use App\Http\Requests\ImportPreviewRequest;
use App\Http\Requests\ItemStoreRequest;
use App\Http\Requests\ItemUpdateRequest;
use App\Http\Requests\UpdateSepaItemPriceRequest;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Models\SepaItem;
use App\Services\BusinessContext;
use App\Services\Items\CatalogQueryService;
use App\Services\Items\CsvDelimiterDetector;
use App\Services\Items\CsvPreviewCache;
use App\Services\Items\CsvPreviewParser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ItemController extends Controller
{
    private const IMPORT_PREVIEW_CACHE_TTL_SECONDS = 3600;

    public function __construct(
        private readonly CsvDelimiterDetector $csvDelimiterDetector,
        private readonly CsvPreviewParser $csvPreviewParser,
        private readonly CsvPreviewCache $csvPreviewCache,
        private readonly BuildImportEstimateAction $buildImportEstimateAction,
    ) {}

    private function persistImportPreviewFile(Request $request): string
    {
        $previewId = (string) Str::uuid();
        $extension = $request->file('file')->getClientOriginalExtension() ?: 'csv';
        $directory = 'tmp/items-import-previews';
        $filename = sprintf('%s.%s', $previewId, $extension);

        return $request->file('file')->storeAs($directory, $filename, 'local');
    }

    public function index(Request $request, CatalogQueryService $catalogQueryService)
    {
        $validated = $request->validate([
            'category' => ['nullable'],
            'search' => ['nullable', 'string'],
            'barcode' => ['nullable', 'string', 'max:255'],
            'source' => ['nullable', Rule::in(['local', 'sepa', 'all'])],
            'only_sepa_price_overridden' => ['nullable', Rule::in(['1', '0', 1, 0, true, false, 'true', 'false'])],
            'only_price_updated' => ['nullable', Rule::in(['1', '0', 1, 0, true, false, 'true', 'false'])],
            'barcode_or_sku' => ['nullable', 'string', 'max:255'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'cursor_paginate' => ['nullable', Rule::in(['1', '0', 1, 0, true, false, 'true', 'false'])],
            'recent_first' => ['nullable', Rule::in(['1', '0', 1, 0, true, false, 'true', 'false'])],
        ]);

        $items = $catalogQueryService->list($validated);

        return ItemResource::collection($items)
            ->additional(['success' => true]);
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

    public function updateSepaPrice(
        UpdateSepaItemPriceRequest $request,
        SepaItem $sepaItem,
        UpsertSepaItemBusinessPriceAction $upsertSepaItemBusinessPriceAction,
        BusinessContext $businessContext
    ) {
        $validated = $request->validated();
        $businessId = $businessContext->getBusinessId();

        $price = array_key_exists('price', $validated) ? $validated['price'] : null;
        $categoryId = array_key_exists('category_id', $validated) ? $validated['category_id'] : null;

        $override = $upsertSepaItemBusinessPriceAction->execute(
            $businessId,
            (int) $sepaItem->id,
            $price !== null && $price !== '' ? (float) $price : null,
            $categoryId !== null && $categoryId !== '' ? (int) $categoryId : null,
        );

        $effectivePrice = $override?->price !== null
            ? round((float) $override->price, 2)
            : round((float) ($sepaItem->list_price ?? $sepaItem->price), 2);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (int) $sepaItem->id,
                'business_id' => $businessId,
                'category_id' => $override?->category_id,
                'name' => $sepaItem->name,
                'sku' => null,
                'barcode' => $sepaItem->barcode,
                'price' => $effectivePrice,
                'presentation_quantity' => $sepaItem->presentation_quantity,
                'presentation_unit' => $sepaItem->presentation_unit,
                'brand' => $sepaItem->brand,
                'list_price' => $sepaItem->list_price,
                'is_active' => true,
                'source' => 'sepa',
                'sepa_item_id' => (int) $sepaItem->id,
                'is_price_overridden' => $override?->price !== null,
                'created_at' => $sepaItem->created_at,
                'updated_at' => now(),
            ],
        ]);
    }

    public function bulkUpdate(Request $request, BulkUpdateItemsAction $bulkUpdateItemsAction)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        $validated = $request->validate([
            'ids' => ['nullable', 'array', 'min:1', 'max:500'],
            'ids.*' => ['integer', 'distinct'],
            'targets' => ['nullable', 'array', 'min:1', 'max:500'],
            'targets.*.id' => ['required_with:targets', 'integer', 'min:1'],
            'targets.*.source' => ['required_with:targets', Rule::in(['local', 'sepa'])],
            'operation' => ['required', Rule::in(['set_category', 'set_price', 'adjust_price'])],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('business_id', $businessId)],
            'price' => ['nullable', 'numeric', 'min:0'],
            'price_delta' => ['nullable', 'numeric'],
        ]);

        if (empty($validated['ids']) && empty($validated['targets'])) {
            return response()->json(['success' => false, 'message' => 'ids or targets is required.'], 422);
        }

        $validated['business_id'] = $businessId;
        $operation = $validated['operation'];

        if ($operation === 'set_category' && ! array_key_exists('category_id', $validated)) {
            return response()->json(['success' => false, 'message' => 'category_id is required for set_category operation.'], 422);
        }
        if ($operation === 'set_price' && ! array_key_exists('price', $validated)) {
            return response()->json(['success' => false, 'message' => 'price is required for set_price operation.'], 422);
        }
        if ($operation === 'adjust_price' && ! array_key_exists('price_delta', $validated)) {
            return response()->json(['success' => false, 'message' => 'price_delta is required for adjust_price operation.'], 422);
        }
        $result = $bulkUpdateItemsAction->execute($validated);

        return response()->json(['success' => true, 'data' => $result]);
    }

    public function destroy(Item $item)
    {
        $item->delete();

        return response()->json(['success' => true, 'message' => 'Item deleted successfully.']);
    }

    public function importPreview(ImportPreviewRequest $request)
    {
        $validated = $request->validated();
        $storedPath = $this->persistImportPreviewFile($request);
        $absolutePath = Storage::disk('local')->path($storedPath);

        $delimiter = $this->csvDelimiterDetector->resolve($validated['delimiter'] ?? null, $absolutePath);
        $lowerCaseHeaders = (bool) ($validated['lowercase_headers'] ?? true);

        $parsed = $this->csvPreviewParser->parseMetadata($absolutePath, $delimiter, $lowerCaseHeaders);
        $previewId = pathinfo($storedPath, PATHINFO_FILENAME);

        $estimatedMetrics = null;
        if (in_array('barcode', $parsed['columns'], true)) {
            $allRows = $this->csvPreviewParser->getAllRows($absolutePath, $delimiter, $parsed['columns']);
            $estimatedMetrics = $this->buildImportEstimateAction->execute($allRows, app(BusinessContext::class)->getBusinessId());
        }

        $this->csvPreviewCache->put($previewId, [
            'path' => $storedPath,
            'delimiter' => $delimiter,
            'lowercase_headers' => $lowerCaseHeaders,
            'columns' => $parsed['columns'],
            'sample' => $parsed['sample'],
            'total_rows' => $parsed['total_rows'],
            'parsing_errors' => $parsed['parsing_errors'],
            'estimated_metrics' => $estimatedMetrics,
        ], self::IMPORT_PREVIEW_CACHE_TTL_SECONDS);

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

    public function importPreviewFull(ImportPreviewRequest $request)
    {
        $validated = $request->validated();
        $cachePayload = null;
        $storedPath = null;
        $previewId = $validated['preview_id'] ?? null;

        if ($previewId) {
            $cachePayload = $this->csvPreviewCache->get($previewId);
            $storedPath = $cachePayload['path'] ?? null;
        }

        if (! $storedPath && $request->hasFile('file')) {
            $storedPath = $this->persistImportPreviewFile($request);
            $previewId = pathinfo($storedPath, PATHINFO_FILENAME);
        }

        if (! $storedPath) {
            return response()->json(['success' => false, 'message' => 'Provide preview_id or file for import preview.'], 422);
        }

        $absolutePath = Storage::disk('local')->path($storedPath);
        $delimiter = $this->csvDelimiterDetector->resolve($validated['delimiter'] ?? ($cachePayload['delimiter'] ?? null), $absolutePath);
        $lowerCaseHeaders = array_key_exists('lowercase_headers', $validated)
            ? (bool) $validated['lowercase_headers']
            : (bool) ($cachePayload['lowercase_headers'] ?? true);

        $parsedMetadata = [
            'columns' => $cachePayload['columns'] ?? null,
            'sample' => $cachePayload['sample'] ?? null,
            'total_rows' => $cachePayload['total_rows'] ?? null,
            'parsing_errors' => $cachePayload['parsing_errors'] ?? null,
            'estimated_metrics' => $cachePayload['estimated_metrics'] ?? null,
        ];

        if (! is_array($parsedMetadata['columns']) || ! is_array($parsedMetadata['sample']) || ! is_int($parsedMetadata['total_rows']) || ! is_array($parsedMetadata['parsing_errors'])) {
            $parsedMetadata = $this->csvPreviewParser->parseMetadata($absolutePath, $delimiter, $lowerCaseHeaders);
        }

        if (! is_array($parsedMetadata['estimated_metrics']) && in_array('barcode', $parsedMetadata['columns'], true)) {
            $allRows = $this->csvPreviewParser->getAllRows($absolutePath, $delimiter, $parsedMetadata['columns']);
            $parsedMetadata['estimated_metrics'] = $this->buildImportEstimateAction->execute($allRows, app(BusinessContext::class)->getBusinessId());
        }

        $this->csvPreviewCache->put($previewId, [
            'path' => $storedPath,
            'delimiter' => $delimiter,
            'lowercase_headers' => $lowerCaseHeaders,
            'columns' => $parsedMetadata['columns'],
            'sample' => $parsedMetadata['sample'],
            'total_rows' => $parsedMetadata['total_rows'],
            'parsing_errors' => $parsedMetadata['parsing_errors'],
            'estimated_metrics' => $parsedMetadata['estimated_metrics'] ?? null,
        ], self::IMPORT_PREVIEW_CACHE_TTL_SECONDS);

        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 100);
        $rows = $this->csvPreviewParser->getRowsPage($absolutePath, $delimiter, $parsedMetadata['columns'], $page, $perPage);
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

    public function importConfirm(ImportConfirmRequest $request, ImportItemsAction $importItemsAction)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $validated = $request->validated();

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
