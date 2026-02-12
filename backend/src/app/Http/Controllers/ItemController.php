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
