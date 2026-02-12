<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Category;
use App\Models\Import;
use App\Http\Resources\ItemResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use App\Services\BusinessContext;

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
            $lineNumber = $index + 2; // +1 por header, +1 por índice base 0
            if (count($row) !== count($normalizedHeader)) {
                $parsingErrors[] = [
                    'line' => $lineNumber,
                    'message' => sprintf(
                        'Column count mismatch at line %d: expected %d, got %d.',
                        $lineNumber,
                        count($normalizedHeader),
                        count($row)
                    )
                ];

                continue;
            }

            $combined = array_combine($normalizedHeader, $row);
            if ($combined === false) {
                $parsingErrors[] = [
                    'line' => $lineNumber,
                    'message' => sprintf('Unable to parse CSV row at line %d.', $lineNumber)
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
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                  ->orWhere('sku', 'like', "%{$term}%");
            });
        }

        $perPage = (int) $request->input('per_page', 20);
        $perPage = $perPage > 0 ? min($perPage, 100) : 20;

        return response()->json(['success' => true, 'data' => ItemResource::collection($query->paginate($perPage))]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'type' => 'required|in:product,service,fee',
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('business_id', app(BusinessContext::class)->getBusinessId())],
            'sku' => 'nullable|string|max:50',
        ]);

        $item = Item::create($validated);
        return response()->json(['success' => true, 'data' => new ItemResource($item)], 201);
    }

    public function show(Item $item)
    {
        return response()->json(['success' => true, 'data' => new ItemResource($item)]);
    }

    public function update(Request $request, Item $item)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0',
            'active' => 'sometimes|boolean',
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('business_id', app(BusinessContext::class)->getBusinessId())],
        ]);

        $item->update($validated);
        return response()->json(['success' => true, 'data' => new ItemResource($item)]);
    }



    public function bulkUpdate(Request $request)
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
            return response()->json([
                'success' => false,
                'message' => 'category_id is required for set_category operation.',
            ], 422);
        }

        if ($operation === 'set_price' && !array_key_exists('price', $validated)) {
            return response()->json([
                'success' => false,
                'message' => 'price is required for set_price operation.',
            ], 422);
        }

        if ($operation === 'adjust_price' && !array_key_exists('price_delta', $validated)) {
            return response()->json([
                'success' => false,
                'message' => 'price_delta is required for adjust_price operation.',
            ], 422);
        }

        if ($operation === 'set_active' && !array_key_exists('active', $validated)) {
            return response()->json([
                'success' => false,
                'message' => 'active is required for set_active operation.',
            ], 422);
        }

        $ids = array_values(array_unique($validated['ids']));

        $result = DB::transaction(function () use ($ids, $operation, $validated) {
            $items = Item::whereIn('id', $ids)->lockForUpdate()->get();

            if ($items->count() !== count($ids)) {
                throw ValidationException::withMessages([
                    'ids' => ['One or more items were not found for the current business.'],
                ]);
            }

            if ($operation === 'set_category') {
                Item::whereIn('id', $ids)->update([
                    'category_id' => $validated['category_id'] ?? null,
                ]);
            }

            if ($operation === 'set_price') {
                Item::whereIn('id', $ids)->update([
                    'price' => round((float) $validated['price'], 2),
                ]);
            }

            if ($operation === 'adjust_price') {
                $delta = (float) $validated['price_delta'];
                foreach ($items as $item) {
                    $newPrice = round(((float) $item->price) * (1 + ($delta / 100)), 2);
                    if ($newPrice < 0) {
                        throw ValidationException::withMessages([
                            'price_delta' => ["Adjusted price cannot be negative for item {$item->id}."],
                        ]);
                    }
                    $item->price = $newPrice;
                    $item->save();
                }
            }

            if ($operation === 'set_active') {
                Item::whereIn('id', $ids)->update([
                    'active' => (bool) $validated['active'],
                ]);
            }

            return [
                'requested_count' => count($ids),
                'updated_count' => count($ids),
                'operation' => $operation,
                'ids' => $ids,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    // --- Import Logic ---

    public function importPreview(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048'
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        $parsed = $this->parseCsvFile($path);

        return response()->json([
            'success' => true,
            'data' => [
                'columns' => $parsed['columns'],
                'sample' => $parsed['sample'],
                'total_rows' => $parsed['total_rows'],
                'parsing_errors' => $parsed['parsing_errors'],
            ]
        ]);
    }

    public function importPreviewFull(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:500',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        $parsed = $this->parseCsvFile($path);

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
            ]
        ]);
    }

    public function importConfirm(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.name' => 'required|string',
            'items.*.price' => 'required|numeric',
            'sync_by_sku' => 'boolean'
        ]);

        $items = $request->input('items');
        $syncBySku = $request->boolean('sync_by_sku');
        $businessId = app(BusinessContext::class)->getBusinessId();
        
        DB::beginTransaction();
        try {
            $count = 0;
            foreach ($items as $row) {
                if ($syncBySku && !empty($row['sku'])) {
                    Item::updateOrCreate(
                        ['business_id' => $businessId, 'sku' => $row['sku']],
                        [
                            'name' => $row['name'],
                            'price' => $row['price'],
                            'type' => $row['type'] ?? 'product',
                            'active' => true
                        ]
                    );
                } else {
                    Item::create([
                        'business_id' => $businessId,
                        'name' => $row['name'],
                        'price' => $row['price'],
                        'sku' => $row['sku'] ?? null,
                        'type' => $row['type'] ?? 'product'
                    ]);
                }
                $count++;
            }

            // Registrar Import
            Import::create([
                'business_id' => $businessId,
                'user_id'     => Auth::id(), // FIX: Usamos la Facade para evitar error de Intelephense
                'source'      => 'csv',
                'status'      => 'imported',
                // FIX: No usamos json_encode porque el modelo Import ya tiene el cast 'array'
                'summary'     => ['imported_count' => $count] 
            ]);

            DB::commit();
            return response()->json([
                'success' => true,
                'data' => [
                    'imported_count' => $count
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
