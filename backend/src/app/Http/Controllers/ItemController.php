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
use Illuminate\Validation\Rule;

class ItemController extends Controller
{
    private function parseCsvFile(string $path): array
    {
        $rawRows = array_map('str_getcsv', file($path));
        $header = array_shift($rawRows) ?? [];
        $normalizedHeader = array_map(static fn ($column) => trim((string) $column), $header);

        $rows = [];
        $sample = [];
        $parsingErrors = [];

        foreach ($rawRows as $index => $row) {
            $lineNumber = $index + 2;
            if (count($row) !== count($normalizedHeader)) {
                $parsingErrors[] = [
                    'line' => $lineNumber,
                    'message' => sprintf(
                        'Column count mismatch at line %d: expected %d, got %d.',
                        $lineNumber,
                        count($normalizedHeader),
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

            $rows[] = $combined;
            if (count($sample) < 5) {
                $sample[] = $combined;
            }
        }

        return [
            'columns' => $normalizedHeader,
            'rows' => $rows,
            'sample' => $sample,
            'total_rows' => count($rows),
            'parsing_errors' => $parsingErrors,
        ];
    }

    public function index(Request $request)
    {
        $query = Item::query();

        if ($request->has('active')) {
            $query->where('active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('category')) {
            $query->where('category_id', $request->category);
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

    public function importPreview(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:2048']);

        $parsed = $this->parseCsvFile($request->file('file')->getRealPath());

        return response()->json([
            'success' => true,
            'data' => [
                'columns' => $parsed['columns'],
                'sample' => $parsed['sample'],
                'total_rows' => $parsed['total_rows'],
                'parsing_errors' => $parsed['parsing_errors'],
            ],
        ]);
    }

    public function importPreviewFull(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:500',
        ]);

        $parsed = $this->parseCsvFile($request->file('file')->getRealPath());

        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 100);
        $offset = ($page - 1) * $perPage;
        $rows = array_slice($parsed['rows'], $offset, $perPage);
        $total = $parsed['total_rows'];

        return response()->json([
            'success' => true,
            'data' => [
                'columns' => $parsed['columns'],
                'rows' => $rows,
                'sample' => $parsed['sample'],
                'total_rows' => $total,
                'parsing_errors' => $parsed['parsing_errors'],
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
        $request->validate([
            'items' => 'required|array',
            'items.*.name' => 'required|string',
            'items.*.price' => 'required|numeric',
            'items.*.barcode' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9\-_.]+$/'],
            'items.*.presentation_quantity' => 'nullable|numeric|min:0',
            'items.*.presentation_unit' => 'nullable|string|max:20',
            'items.*.brand' => 'nullable|string|max:120',
            'items.*.list_price' => 'nullable|numeric|min:0',
            'sync_by_sku' => 'boolean',
            'sync_by_barcode' => 'boolean',
        ]);

        try {
            $result = $importItemsAction->execute(
                $request->input('items'),
                $request->boolean('sync_by_sku'),
                app(BusinessContext::class)->getBusinessId(),
                $request->boolean('sync_by_barcode', true)
            );

            return response()->json(['success' => true, 'data' => $result]);
        } catch (\Throwable $exception) {
            return response()->json(['success' => false, 'message' => $exception->getMessage()], 500);
        }
    }
}
