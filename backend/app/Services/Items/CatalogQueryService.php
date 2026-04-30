<?php

namespace App\Services\Items;

use App\Models\BusinessParameter;
use App\Models\Item;
use App\Models\SepaItem;
use App\Services\BusinessContext;
use App\Services\Items\RecentItemUsageService;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\DB;

class CatalogQueryService
{
    private const CATALOG_SELECT_COLUMNS = [
        'id',
        'business_id',
        'category_id',
        'name',
        'sku',
        'barcode',
        'price',
        'presentation_quantity',
        'presentation_unit',
        'brand',
        'list_price',
        'is_active',
        'created_at',
        'updated_at',
        'source',
        'sepa_item_id',
        'is_price_overridden',
    ];

    public function __construct(
        private readonly BusinessContext $businessContext,
        private readonly RecentItemUsageService $recentItemUsageService,
    )
    {
    }

    public function list(array $filters): LengthAwarePaginator|CursorPaginator
    {
        $businessId = $this->businessContext->getBusinessId();
        $sepaEnabled = $this->isSepaEnabled($businessId);
        $source = $filters['source'] ?? 'all';

        $query = $this->buildCatalogQuery($businessId, $sepaEnabled, $source, $filters);
        $this->applyRecentOrdering($query, $businessId, $filters);

        $perPage = $this->resolvePerPage($filters);
        $useCursor = filter_var($filters['cursor_paginate'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($useCursor) {
            return $query->cursorPaginate($perPage);
        }

        $page = isset($filters['page']) ? max(1, (int) $filters['page']) : null;

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    private function buildCatalogQuery(int $businessId, bool $sepaEnabled, string $source, array $filters): EloquentBuilder|QueryBuilder
    {
        $normalizedSource = in_array($source, ['local', 'sepa', 'all'], true) ? $source : 'all';
        $onlySepaPriceOverridden = filter_var($filters['only_sepa_price_overridden'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($onlySepaPriceOverridden) {
            if (!$sepaEnabled) {
                return $this->buildLocalQuery($filters)->whereRaw('1 = 0');
            }

            return $this->buildSepaQuery($businessId, $filters)
                ->orderBy('sepa_items.name')
                ->orderBy('sepa_items.id');
        }

        if (!$sepaEnabled) {
            return $this->buildLocalQuery($filters)
                ->orderBy('items.name')
                ->orderBy('items.id');
        }

        if ($normalizedSource === 'local') {
            return $this->buildLocalQuery($filters)
                ->orderBy('items.name')
                ->orderBy('items.id');
        }

        if ($normalizedSource === 'sepa') {
            return $this->buildSepaQuery($businessId, $filters)
                ->orderBy('sepa_items.name')
                ->orderBy('sepa_items.id');
        }

        $localQuery = $this->buildLocalQuery($filters);
        $sepaQuery = $this->buildSepaQuery($businessId, $filters);

        $qualifiedColumns = array_map(fn($col) => "catalog_items.{$col}", self::CATALOG_SELECT_COLUMNS);

        return DB::query()
            ->fromSub($localQuery->toBase()->unionAll($sepaQuery->toBase()), 'catalog_items')
            ->select($qualifiedColumns)
            ->orderBy('catalog_items.name')
            ->orderBy('catalog_items.id');
    }

    private function buildLocalQuery(array $filters): EloquentBuilder
    {
        $query = Item::query()->select([
            DB::raw('CAST(items.id AS bigint) as id'),
            DB::raw('CAST(items.business_id AS bigint) as business_id'),
            DB::raw('CAST(items.category_id AS bigint) as category_id'),
            DB::raw('CAST(items.name AS varchar) as name'),
            DB::raw('CAST(items.sku AS varchar) as sku'),
            DB::raw('CAST(items.barcode AS varchar) as barcode'),
            DB::raw('CAST(items.price AS decimal(12,2)) as price'),
            DB::raw('CAST(items.presentation_quantity AS decimal(12,2)) as presentation_quantity'),
            DB::raw('CAST(items.presentation_unit AS varchar) as presentation_unit'),
            DB::raw('CAST(items.brand AS varchar) as brand'),
            DB::raw('CAST(items.list_price AS decimal(12,2)) as list_price'),
            DB::raw('CAST(1 AS integer) as is_active'),
            'items.created_at',
            'items.updated_at',
            DB::raw("CAST('local' AS varchar) as source"),
            DB::raw('CAST(NULL AS bigint) as sepa_item_id'),
            DB::raw('CAST(0 AS integer) as is_price_overridden'),
        ]);

        return $this->applyCommonFilters($query, $filters, 'items');
    }

    private function buildSepaQuery(int $businessId, array $filters): EloquentBuilder
    {
        $query = SepaItem::query()
            ->leftJoin('sepa_item_business_prices as sibp', function ($join) use ($businessId) {
                $join->on('sibp.sepa_item_id', '=', 'sepa_items.id')
                    ->where('sibp.business_id', '=', $businessId);
            })
            ->select([
                DB::raw('CAST(sepa_items.id AS bigint) as id'),
                DB::raw("CAST({$businessId} AS bigint) as business_id"),
                DB::raw('CAST(sibp.category_id AS bigint) as category_id'),
                DB::raw('CAST(sepa_items.name AS varchar) as name'),
                DB::raw('CAST(NULL AS varchar) as sku'), // compat API: SEPA mantiene sku en null sin depender de sepa_items.sku
                DB::raw('CAST(sepa_items.barcode AS varchar) as barcode'),
                DB::raw('CAST(COALESCE(sibp.price, sepa_items.list_price) AS decimal(12,2)) as price'),
                DB::raw('CAST(sepa_items.presentation_quantity AS decimal(12,2)) as presentation_quantity'),
                DB::raw('CAST(sepa_items.presentation_unit AS varchar) as presentation_unit'),
                DB::raw('CAST(sepa_items.brand AS varchar) as brand'),
                DB::raw('CAST(sepa_items.list_price AS decimal(12,2)) as list_price'),
                DB::raw('CAST(1 AS integer) as is_active'),
                'sepa_items.created_at',
                'sepa_items.updated_at',
                DB::raw("CAST('sepa' AS varchar) as source"),
                DB::raw('CAST(sepa_items.id AS bigint) as sepa_item_id'),
                DB::raw('CAST(CASE WHEN sibp.price IS NULL THEN 0 ELSE 1 END AS integer) as is_price_overridden'),
            ]);

        return $this->applyCommonFilters($query, $filters, 'sepa_items');
    }

    private function applyCommonFilters(EloquentBuilder $query, array $filters, string $table): EloquentBuilder
    {
        if (array_key_exists('category', $filters) && $filters['category'] !== null && $filters['category'] !== '') {
            $categoryColumn = $table === 'items' ? 'items.category_id' : 'sibp.category_id';
            if ($filters['category'] === 'uncategorized') {
                $query->whereNull($categoryColumn);
            } else {
                $query->where($categoryColumn, $filters['category']);
            }
        }

        if ($table === 'sepa_items' && filter_var($filters['only_sepa_price_overridden'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $query->whereNotNull('sibp.price');
        }

        if (filter_var($filters['only_price_updated'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            if ($table === 'sepa_items') {
                $query->where(function (EloquentBuilder $inner): void {
                    $inner->whereNotNull('sepa_items.list_price')
                        ->whereRaw('COALESCE(sibp.price, sepa_items.list_price, sepa_items.price) > sepa_items.list_price');
                });
            } else {
                $query->whereNotNull('items.price');
            }
        }

        if (!empty($filters['barcode'])) {
            $barcode = trim((string) $filters['barcode']);
            $query->where("{$table}.barcode", 'like', "{$barcode}%");
        }

        if (!empty($filters['barcode_or_sku'])) {
            $barcodeOrSku = trim((string) $filters['barcode_or_sku']);
            $query->where(function (EloquentBuilder $inner) use ($table, $barcodeOrSku): void {
                $inner->where("{$table}.barcode", 'like', "{$barcodeOrSku}%");

                if ($table === 'items') {
                    $inner->orWhere("{$table}.sku", 'like', "%{$barcodeOrSku}%");
                }
            });
        }

        if (!empty($filters['search'])) {
            $term = trim((string) $filters['search']);
            $this->applySearchFilter($query, $table, $term);
        }

        return $query;
    }

    private function applySearchFilter(EloquentBuilder $query, string $table, string $term): void
    {
        if ($term === '') {
            return;
        }

        if ($this->looksLikeBarcode($term)) {
            $query->where(function (EloquentBuilder $inner) use ($table, $term) {
                $inner->where("{$table}.barcode", '=', $term)
                    ->orWhere("{$table}.barcode", 'like', "{$term}%");
            });

            return;
        }

        $tokens = preg_split('/\s+/', trim($term)) ?: [];
        $tokens = array_values(array_filter($tokens, static fn (string $token): bool => $token !== ''));

        $query->where(function (EloquentBuilder $inner) use ($table, $term, $tokens) {
            $inner->where("{$table}.name", 'like', "%{$term}%")
                ->orWhere("{$table}.brand", 'like', "%{$term}%")
                ->orWhere("{$table}.barcode", 'like', "{$term}%");

            if ($table === 'items') {
                $inner->orWhere("{$table}.sku", 'like', "%{$term}%");
            }

            foreach ($tokens as $token) {
                $inner->orWhere("{$table}.name", 'like', "%{$token}%")
                    ->orWhere("{$table}.brand", 'like', "%{$token}%");
                if ($table === 'items') {
                    $inner->orWhere("{$table}.sku", 'like', "%{$token}%");
                }
            }
        });
    }

    private function looksLikeBarcode(string $term): bool
    {
        return preg_match('/^\d{4,}$/', $term) === 1;
    }


    private function applyRecentOrdering(EloquentBuilder|QueryBuilder $query, int $businessId, array $filters): void
    {
        $recentFirst = filter_var($filters['recent_first'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if (!$recentFirst || !empty($filters['search']) || !empty($filters['barcode']) || !empty($filters['category'])) {
            return;
        }

        $topKeys = $this->recentItemUsageService->topKeys($businessId, 60);
        if ($topKeys === []) {
            return;
        }

        $cases = [];
        $bindings = [];

        foreach ($topKeys as $idx => $key) {
            [$source, $id] = array_pad(explode(':', $key, 2), 2, null);
            if (!in_array($source, ['local', 'sepa'], true) || !is_numeric($id)) {
                continue;
            }

            $cases[] = 'WHEN (source = ? AND id = ?) THEN ?';
            $bindings[] = $source;
            $bindings[] = (int) $id;
            $bindings[] = $idx;
        }

        if ($cases === []) {
            return;
        }

        $sql = 'CASE ' . implode(' ', $cases) . ' ELSE 999999 END';

        if ($query instanceof EloquentBuilder) {
            $query->reorder();
        }

        $query->orderByRaw($sql . ' ASC', $bindings);
    }

    private function resolvePerPage(array $filters): int
    {
        $perPage = (int) ($filters['per_page'] ?? 20);

        if ($perPage <= 0) {
            return 20;
        }

        return min($perPage, 100);
    }

    private function isSepaEnabled(int $businessId): bool
    {
        return BusinessParameter::query()
            ->where('business_id', $businessId)
            ->where('parameter_id', BusinessParameter::ENABLE_SEPA_ITEMS)
            ->exists();
    }
}
