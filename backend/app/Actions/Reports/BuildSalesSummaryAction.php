<?php

namespace App\Actions\Reports;

use App\Models\Sale;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class BuildSalesSummaryAction
{
    public function execute(int $businessId, array $filters): array
    {
        $salesQuery = $this->buildFilteredSalesQuery(
            $businessId,
            $filters['start_date'] ?? null,
            $filters['end_date'] ?? null,
            $filters['include_voided'] ?? false,
            $filters['payment_method'] ?? null,
            $filters['category_id'] ?? null,
            $filters['statuses'] ?? collect()
        );

        $summaryByStatus = (clone $salesQuery)
            ->selectRaw('status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount')
            ->groupBy('status')
            ->get();

        $totalsByStatus = $summaryByStatus
            ->map(fn ($row) => [
                'status' => $row->status,
                'count' => (int) $row->count,
                'total_amount' => (float) $row->total_amount,
            ])
            ->values();

        $summaryTotals = $summaryByStatus
            ->reduce(function (array $carry, $row) {
                if ($row->status === 'closed') {
                    $carry['total_sales'] = (float) $row->total_amount;
                    $carry['sales_count'] = (int) $row->count;
                }

                if ($row->status === 'voided') {
                    $carry['voided_count'] = (int) $row->count;
                }

                return $carry;
            }, [
                'total_sales' => 0.0,
                'sales_count' => 0,
                'voided_count' => 0,
            ]);

        $filteredSales = $salesQuery->toBase();

        $totalsByPaymentMethod = DB::table('sale_payments')
            ->joinSub($filteredSales, 'filtered_sales', function ($join) {
                $join->on('sale_payments.sale_id', '=', 'filtered_sales.id');
            })
            ->join('payment_methods', 'sale_payments.payment_method_id', '=', 'payment_methods.id')
            ->where('filtered_sales.status', 'closed')
            ->select('payment_methods.code', 'payment_methods.name')
            ->selectRaw('SUM(sale_payments.amount) as total_amount')
            ->selectRaw('COUNT(sale_payments.id) as payments_count')
            ->groupBy('payment_methods.code', 'payment_methods.name')
            ->get();

        $totalsByCategoryQuery = DB::query()
            ->fromSub($filteredSales, 'filtered_sales')
            ->join('sale_items', 'filtered_sales.id', '=', 'sale_items.sale_id')
            ->leftJoin('items', 'sale_items.item_id', '=', 'items.id')
            ->leftJoin('categories', function ($join) {
                $join->on('categories.id', '=', DB::raw('COALESCE(items.category_id, sale_items.category_id_snapshot)'));
            })
            ->where('filtered_sales.status', 'closed');

        if (!empty($filters['category_id'])) {
            if ($filters['category_id'] === 'uncategorized') {
                $totalsByCategoryQuery->whereNull(DB::raw('COALESCE(items.category_id, sale_items.category_id_snapshot)'));
            } else {
                $totalsByCategoryQuery->where(DB::raw('COALESCE(items.category_id, sale_items.category_id_snapshot)'), $filters['category_id']);
            }
        }

        $totalsByCategory = $totalsByCategoryQuery
            ->select('categories.id', 'categories.color')
            ->selectRaw("COALESCE(categories.name, ?) as name", ['Sin categoría'])
            ->selectRaw('COALESCE(categories.icon, ?) as icon', [1])
            ->selectRaw('SUM(sale_items.total) as total_amount')
            ->groupBy('categories.id', 'categories.name', 'categories.color', 'categories.icon')
            ->havingRaw('SUM(sale_items.total) > 0')
            ->orderByDesc('total_amount')
            ->get();

        return [
            'summary' => [
                'total_sales' => $summaryTotals['total_sales'],
                'sales_count' => $summaryTotals['sales_count'],
                'voided_count' => $summaryTotals['voided_count'],
            ],
            'totals_by_status' => $totalsByStatus,
            'totals_by_payment_method' => $totalsByPaymentMethod,
            'totals_by_category' => $totalsByCategory,
        ];
    }

    private function buildFilteredSalesQuery(
        int $businessId,
        ?string $startDate,
        ?string $endDate,
        bool $includeVoided,
        ?string $paymentMethod,
        ?string $categoryId,
        Collection $statuses
    ): Builder {
        $query = Sale::query()->where('business_id', $businessId);

        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }
        if ($statuses->isNotEmpty()) {
            $query->whereIn('status', $statuses->all());
        } elseif (!$includeVoided) {
            $query->where('status', '!=', 'voided');
        }
        if ($paymentMethod) {
            $query->whereExists(function ($subQuery) use ($paymentMethod) {
                $subQuery->selectRaw('1')
                    ->from('sale_payments')
                    ->join('payment_methods', 'sale_payments.payment_method_id', '=', 'payment_methods.id')
                    ->whereColumn('sale_payments.sale_id', 'sales.id')
                    ->where('payment_methods.code', $paymentMethod);
            });
        }
        if ($categoryId) {
            $query->whereExists(function ($subQuery) use ($categoryId) {
                $subQuery->selectRaw('1')
                    ->from('sale_items')
                    ->leftJoin('items', 'sale_items.item_id', '=', 'items.id')
                    ->whereColumn('sale_items.sale_id', 'sales.id');

                if ($categoryId === 'uncategorized') {
                    $subQuery->whereNull(DB::raw('COALESCE(items.category_id, sale_items.category_id_snapshot)'));
                } else {
                    $subQuery->where(DB::raw('COALESCE(items.category_id, sale_items.category_id_snapshot)'), $categoryId);
                }
            });
        }

        return $query;
    }
}
