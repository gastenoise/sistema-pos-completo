<?php

namespace App\Http\Controllers;

use App\Actions\Reports\BuildSalesSummaryAction;
use App\Models\Sale;
use App\Models\PaymentMethod;
use App\Models\BusinessPaymentMethodHide;
use Illuminate\Http\Request;
use App\Services\BusinessContext;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{

    private function buildFilteredSalesQuery(
        int $businessId,
        ?string $startDate,
        ?string $endDate,
        bool $includeVoided,
        ?string $paymentMethod,
        ?string $categoryId,
        $statuses
    ) {
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

    private function getSaleStatusLabel(?string $status): string
    {
        return match ($status) {
            'closed' => 'Cerrada',
            'open' => 'Abierta',
            'voided' => 'Eliminada',
            null, '' => 'Desconocido',
            default => sprintf('Desconocido (%s)', $status),
        };
    }

    public function salesList(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $includeVoided = $request->boolean('include_voided');
        $paymentMethod = $request->input('payment_method');
        $categoryId = $request->input('category_id');
        $statuses = collect(explode(',', (string) $request->input('statuses', '')))
            ->map(fn ($status) => trim($status))
            ->filter();

        $query = Sale::with(['items.item.category', 'items.categorySnapshot', 'payments.paymentMethod', 'user'])
            ->where('business_id', $businessId);

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
            $query->whereHas('payments.paymentMethod', function ($paymentQuery) use ($paymentMethod) {
                $paymentQuery->where('code', $paymentMethod);
            });
        }
        if ($categoryId) {
            $query->whereHas('items.item', function ($itemQuery) use ($categoryId) {
                if ($categoryId === 'uncategorized') {
                    $itemQuery->whereNull(DB::raw('COALESCE(items.category_id, sale_items.category_id_snapshot)'));
                } else {
                    $itemQuery->where(DB::raw('COALESCE(items.category_id, sale_items.category_id_snapshot)'), $categoryId);
                }
            });
        }

        $sales = $query->get()->map(function (Sale $sale) {
            $primaryPayment = $sale->payments->first();
            $paymentMethodTypes = $sale->payments
                ->map(fn ($payment) => $payment->paymentMethod?->code)
                ->filter()
                ->values()
                ->unique()
                ->values();

            return [
                'id' => $sale->id,
                'status' => $sale->status,
                'total_amount' => $sale->total_amount,
                'created_at' => $sale->created_at,
                'closed_at' => $sale->closed_at,
                'items' => $sale->items->map(function ($saleItem) {
                    $itemData = $saleItem->toArray();
                    $itemData['category_name'] = $saleItem->item?->category?->name ?? $saleItem->categorySnapshot?->name ?? 'Sin categoría';
                    return $itemData;
                }),
                'payments' => $sale->payments->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'amount' => $payment->amount,
                        'payment_method_id' => $payment->payment_method_id,
                        'payment_method_code' => $payment->paymentMethod?->code,
                        'status' => $payment->status,
                        'transaction_reference' => $payment->transaction_reference,
                    ];
                }),
                'payment_method_type' => $primaryPayment?->paymentMethod?->code,
                'payment_method_types' => $paymentMethodTypes,
            ];
        });

        return response()->json(['success' => true, 'data' => $sales]);
    }

    public function salesSummary(Request $request, BuildSalesSummaryAction $buildSalesSummaryAction)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        $filters = [
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'include_voided' => $request->boolean('include_voided'),
            'payment_method' => $request->input('payment_method'),
            'category_id' => $request->input('category_id'),
            'statuses' => collect(explode(',', (string) $request->input('statuses', '')))
                ->map(fn ($status) => trim($status))
                ->filter(),
        ];

        $summary = $buildSalesSummaryAction->execute($businessId, $filters);

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    public function dailySummary(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $date = $request->input('date');

        $summary = Sale::query()
            ->where('business_id', $businessId)
            ->when($date, fn ($query) => $query->whereDate('created_at', $date))
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'closed' THEN total_amount ELSE 0 END), 0) as total_sales")
            ->selectRaw("SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as sales_count")
            ->selectRaw("SUM(CASE WHEN status = 'voided' THEN 1 ELSE 0 END) as voided_count")
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $date,
                'total_sales' => (float) ($summary->total_sales ?? 0),
                'sales_count' => (int) ($summary->sales_count ?? 0),
                'voided_count' => (int) ($summary->voided_count ?? 0),
            ]
        ]);
    }

    public function export(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $statuses = collect(explode(',', (string) $request->input('statuses', '')))
            ->map(fn ($status) => trim($status))
            ->filter();

        $query = Sale::with(['items.item.category', 'items.categorySnapshot', 'payments.paymentMethod', 'user'])
            ->where('business_id', $businessId);

        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }
        if ($statuses->isNotEmpty()) {
            $query->whereIn('status', $statuses->all());
        }

        $hiddenPaymentMethodIds = BusinessPaymentMethodHide::where('business_id', $businessId)
            ->pluck('payment_method_id');

        $paymentMethods = PaymentMethod::query()
            ->orderBy('id')
            ->get()
            ->map(function (PaymentMethod $method) use ($hiddenPaymentMethodIds) {
                $isActive = !$hiddenPaymentMethodIds->contains($method->id);

                return [
                    'id' => $method->id,
                    'name' => $method->name,
                    'column_name' => $isActive ? $method->name : sprintf('%s (Inactivo)', $method->name),
                ];
            })
            ->values();

        $wantsJson = $request->boolean('format_json');
        if ($wantsJson) {
            $sales = $query->get()->map(function (Sale $sale) {
                $primaryPayment = $sale->payments->first();
                $paymentMethodTypes = $sale->payments
                    ->map(fn ($payment) => $payment->paymentMethod?->code)
                    ->filter()
                    ->values()
                    ->unique()
                    ->values();

                return [
                    'id' => $sale->id,
                    'status' => $sale->status,
                    'total_amount' => $sale->total_amount,
                    'created_at' => $sale->created_at,
                    'closed_at' => $sale->closed_at,
                    'items' => $sale->items->map(function ($saleItem) {
                        $itemData = $saleItem->toArray();
                        $itemData['category_name'] = $saleItem->item?->category?->name ?? $saleItem->categorySnapshot?->name ?? 'Sin categoría';
                        return $itemData;
                    }),
                    'payments' => $sale->payments->map(function ($payment) {
                        return [
                            'id' => $payment->id,
                            'amount' => $payment->amount,
                            'payment_method_id' => $payment->payment_method_id,
                            'payment_method_code' => $payment->paymentMethod?->code,
                            'status' => $payment->status,
                            'transaction_reference' => $payment->transaction_reference,
                        ];
                    }),
                    'payment_method_type' => $primaryPayment?->paymentMethod?->code,
                    'payment_method_types' => $paymentMethodTypes,
                ];
            });

            return response()->json(['success' => true, 'data' => $sales]);
        }

        return new StreamedResponse(function() use ($query, $paymentMethods) {
            $handle = fopen('php://output', 'w');

            fwrite($handle, "\xEF\xBB\xBF");

            $headers = [
                'ID',
                'Fecha',
                'Hora',
                'Items',
                'Categoría',
            ];

            foreach ($paymentMethods as $method) {
                $headers[] = $method['column_name'];
            }

            $headers = array_merge($headers, [
                'Subtotal',
                'Total',
                'Estado',
                'Vendedor',
                'Referencias',
            ]);

            fputcsv($handle, $headers);

            $query->chunk(100, function($sales) use ($handle, $paymentMethods) {
                foreach ($sales as $sale) {
                    $saleDate = Carbon::parse($sale->closed_at ?? $sale->created_at)->setTimezone('America/Argentina/Buenos_Aires');
                    $itemsQty = (int) $sale->items->sum('quantity');
                    $subtotal = (float) $sale->items->sum('total');
                    $categories = $sale->items
                        ->map(fn ($saleItem) => $saleItem->item?->category?->name ?? $saleItem->categorySnapshot?->name)
                        ->filter()
                        ->unique()
                        ->values()
                        ->implode(', ');

                    $paymentsByMethod = $sale->payments
                        ->groupBy('payment_method_id')
                        ->map(fn ($payments) => (float) $payments->sum('amount'));

                    $transactionReferences = $sale->payments
                        ->map(fn ($payment) => $payment->transaction_reference)
                        ->filter()
                        ->unique()
                        ->values()
                        ->implode(' | ');

                    $row = [
                        $sale->id,
                        optional($saleDate)?->format('d/m/Y'),
                        optional($saleDate)?->format('H:i'),
                        $itemsQty,
                        $categories,
                    ];

                    foreach ($paymentMethods as $method) {
                        $row[] = number_format((float) ($paymentsByMethod[$method['id']] ?? 0), 2, '.', '');
                    }

                    $row = array_merge($row, [
                        number_format($subtotal, 2, '.', ''),
                        number_format((float) $sale->total_amount, 2, '.', ''),
                        $this->getSaleStatusLabel($sale->status),
                        $sale->user?->name,
                        $transactionReferences,
                    ]);

                    fputcsv($handle, $row);
                }
            });
            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="sales.csv"',
        ]);
    }
}
