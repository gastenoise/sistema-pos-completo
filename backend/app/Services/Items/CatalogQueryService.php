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
                ->orderBy('name')
                ->orderBy('id');
        }

        if (!$sepaEnabled) {
            return $this->buildLocalQuery($filters);
        }

        if ($normalizedSource === 'local') {
            return $this->buildLocalQuery($filters);
        }

        if ($normalizedSource === 'sepa') {
            return $this->buildSepaQuery($businessId, $filters);
        }

        $localQuery = $this->buildLocalQuery($filters);
        $sepaQuery = $this->buildSepaQuery($businessId, $filters);

        return DB::query()
            ->fromSub($localQuery->unionAll($sepaQuery), 'catalog_items')
            ->select(self::CATALOG_SELECT_COLUMNS)
            ->orderBy('name')
            ->orderBy('id');
    }

    private function buildLocalQuery(array $filters): EloquentBuilder
    {
        $query = Item::query()->select([
            'items.id',
            'items.business_id',
            'items.category_id',
            'items.name',
            'items.sku',
            'items.barcode',
            'items.price',
            'items.presentation_quantity',
            'items.presentation_unit',
            'items.brand',
            'items.list_price',
            DB::raw('true as is_active'),
            'items.created_at',
            'items.updated_at',
            DB::raw("'local' as source"),
            DB::raw('null as sepa_item_id'),
            DB::raw('false as is_price_overridden'),
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
                'sepa_items.id',
                DB::raw("{$businessId} as business_id"),
                DB::raw('sibp.category_id as category_id'),
                'sepa_items.name',
                DB::raw('null as sku'), // compat API: SEPA mantiene sku en null sin depender de sepa_items.sku
                'sepa_items.barcode',
                DB::raw('COALESCE(sibp.price, sepa_items.list_price, sepa_items.price) as price'),
                'sepa_items.presentation_quantity',
                'sepa_items.presentation_unit',
                'sepa_items.brand',
                'sepa_items.list_price',
                DB::raw('true as is_active'),
                'sepa_items.created_at',
                'sepa_items.updated_at',
                DB::raw("'sepa' as source"),
                DB::raw('sepa_items.id as sepa_item_id'),
                DB::raw('CASE WHEN sibp.price IS NULL THEN false ELSE true END as is_price_overridden'),
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
                $query->whereNotNull('items.list_price')
                    ->whereColumn('items.price', '>', 'items.list_price');
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

            $cases[] = 'WHEN source = ? AND id = ? THEN ?';
            $bindings[] = $source;
            $bindings[] = (int) $id;
            $bindings[] = $idx;
        }

        if ($cases === []) {
            return;
        }

        $sql = 'CASE ' . implode(' ', $cases) . ' ELSE 999999 END';
        $query->reorder();
        $query->orderByRaw($sql . ' ASC', $bindings)
            ->orderBy('name')
            ->orderBy('id');
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
