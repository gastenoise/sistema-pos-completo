<?php

namespace App\Services\Items;

use App\Models\BusinessParameter;
use App\Models\Item;
use App\Models\SepaItem;
use App\Services\BusinessContext;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class CatalogQueryService
{
    public function __construct(private readonly BusinessContext $businessContext)
    {
    }

    public function list(array $filters): LengthAwarePaginator|CursorPaginator
    {
        $businessId = $this->businessContext->getBusinessId();
        $sepaEnabled = $this->isSepaEnabled($businessId);
        $source = $filters['source'] ?? 'all';

        $query = $this->buildCatalogQuery($businessId, $sepaEnabled, $source, $filters);

        $perPage = $this->resolvePerPage($filters);
        $useCursor = filter_var($filters['cursor_paginate'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($useCursor) {
            return $query->cursorPaginate($perPage);
        }

        return $query->paginate($perPage);
    }

    private function buildCatalogQuery(int $businessId, bool $sepaEnabled, string $source, array $filters): Builder
    {
        $normalizedSource = in_array($source, ['local', 'sepa', 'all'], true) ? $source : 'all';

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
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->orderBy('id');
    }

    private function buildLocalQuery(array $filters): Builder
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
            'items.active as is_active',
            'items.created_at',
            'items.updated_at',
            DB::raw("'local' as source"),
            DB::raw('null as sepa_item_id'),
            DB::raw('false as is_price_overridden'),
        ]);

        return $this->applyCommonFilters($query, $filters, 'items');
    }

    private function buildSepaQuery(int $businessId, array $filters): Builder
    {
        $query = SepaItem::query()
            ->leftJoin('sepa_item_business_prices as sibp', function ($join) use ($businessId) {
                $join->on('sibp.sepa_item_id', '=', 'sepa_items.id')
                    ->where('sibp.business_id', '=', $businessId);
            })
            ->select([
                'sepa_items.id',
                DB::raw("{$businessId} as business_id"),
                DB::raw('null as category_id'),
                'sepa_items.name',
                'sepa_items.sku',
                'sepa_items.barcode',
                DB::raw('COALESCE(sibp.price, sepa_items.price) as price'),
                'sepa_items.presentation_quantity',
                'sepa_items.presentation_unit',
                'sepa_items.brand',
                'sepa_items.list_price',
                'sepa_items.active as is_active',
                'sepa_items.created_at',
                'sepa_items.updated_at',
                DB::raw("'sepa' as source"),
                DB::raw('sepa_items.id as sepa_item_id'),
                DB::raw('CASE WHEN sibp.id IS NULL THEN false ELSE true END as is_price_overridden'),
            ]);

        return $this->applyCommonFilters($query, $filters, 'sepa_items');
    }

    private function applyCommonFilters(Builder $query, array $filters, string $table): Builder
    {
        if (array_key_exists('active', $filters) && $filters['active'] !== null && $filters['active'] !== '') {
            $query->where("{$table}.active", filter_var($filters['active'], FILTER_VALIDATE_BOOLEAN));
        }

        if ($table === 'items' && array_key_exists('category', $filters) && $filters['category'] !== null && $filters['category'] !== '') {
            if ($filters['category'] === 'uncategorized') {
                $query->whereNull('items.category_id');
            } else {
                $query->where('items.category_id', $filters['category']);
            }
        }

        if ($table === 'sepa_items' && filter_var($filters['only_sepa_price_overridden'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $query->whereNotNull('sibp.id');
        }

        if (!empty($filters['barcode'])) {
            $barcode = trim((string) $filters['barcode']);
            $query->where("{$table}.barcode", 'like', "{$barcode}%");
        }

        if (!empty($filters['search'])) {
            $term = trim((string) $filters['search']);
            $query->where(function (Builder $inner) use ($table, $term) {
                $inner->where("{$table}.name", 'like', "%{$term}%")
                    ->orWhere("{$table}.sku", 'like', "%{$term}%")
                    ->orWhere("{$table}.barcode", 'like', "{$term}%");
            });
        }

        return $query;
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
