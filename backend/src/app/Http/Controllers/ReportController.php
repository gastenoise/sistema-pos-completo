<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use Illuminate\Http\Request;
use App\Services\BusinessContext;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function salesList(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $includeVoided = $request->boolean('include_voided');
        $paymentMethod = $request->input('payment_method');

        $query = Sale::with(['items', 'payments.paymentMethod', 'user'])
            ->where('business_id', $businessId);

        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }
        if (!$includeVoided) {
            $query->where('status', '!=', 'voided');
        }
        if ($paymentMethod) {
            $query->whereHas('payments.paymentMethod', function ($paymentQuery) use ($paymentMethod) {
                $paymentQuery->where('code', $paymentMethod);
            });
        }

        $sales = $query->get()->map(function (Sale $sale) {
            $primaryPayment = $sale->payments->first();

            return [
                'id' => $sale->id,
                'status' => $sale->status,
                'total_amount' => $sale->total_amount,
                'created_at' => $sale->created_at,
                'closed_at' => $sale->closed_at,
                'items' => $sale->items,
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
            ];
        });

        return response()->json(['success' => true, 'data' => $sales]);
    }

    public function salesSummary(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $includeVoided = $request->boolean('include_voided');
        $paymentMethod = $request->input('payment_method');

        $salesQuery = Sale::query()
            ->where('business_id', $businessId);

        if ($startDate) {
            $salesQuery->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $salesQuery->whereDate('created_at', '<=', $endDate);
        }
        if (!$includeVoided) {
            $salesQuery->where('status', '!=', 'voided');
        }
        if ($paymentMethod) {
            $salesQuery->whereHas('payments.paymentMethod', function ($paymentQuery) use ($paymentMethod) {
                $paymentQuery->where('code', $paymentMethod);
            });
        }

        $sales = $salesQuery->get(['id', 'status', 'total_amount']);

        $totalsByStatus = $sales
            ->groupBy('status')
            ->map(function ($group, $status) {
                return [
                    'status' => $status,
                    'count' => $group->count(),
                    'total_amount' => $group->sum('total_amount'),
                ];
            })
            ->values();

        $paymentsQuery = DB::table('sale_payments')
            ->join('sales', 'sale_payments.sale_id', '=', 'sales.id')
            ->join('payment_methods', 'sale_payments.payment_method_id', '=', 'payment_methods.id')
            ->where('sales.business_id', $businessId);

        if ($startDate) {
            $paymentsQuery->whereDate('sales.created_at', '>=', $startDate);
        }
        if ($endDate) {
            $paymentsQuery->whereDate('sales.created_at', '<=', $endDate);
        }
        if (!$includeVoided) {
            $paymentsQuery->where('sales.status', '!=', 'voided');
        }
        if ($paymentMethod) {
            $paymentsQuery->where('payment_methods.code', $paymentMethod);
        }

        $totalsByPaymentMethod = $paymentsQuery
            ->select(
                'payment_methods.code',
                'payment_methods.name',
                DB::raw('SUM(sale_payments.amount) as total_amount'),
                DB::raw('COUNT(sale_payments.id) as payments_count')
            )
            ->groupBy('payment_methods.code', 'payment_methods.name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => [
                    'total_sales' => $sales->sum('total_amount'),
                    'sales_count' => $sales->count(),
                    'voided_count' => $sales->where('status', 'voided')->count(),
                ],
                'totals_by_status' => $totalsByStatus,
                'totals_by_payment_method' => $totalsByPaymentMethod,
            ],
        ]);
    }

    public function dailySummary(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $date = $request->input('date');

        $query = Sale::query()
            ->where('business_id', $businessId);

        if ($date) {
            $query->whereDate('created_at', $date);
        }

        $sales = $query->get();
        $closedSales = $sales->where('status', 'closed');

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $date,
                'total_sales' => $closedSales->sum('total_amount'),
                'sales_count' => $closedSales->count(),
                'voided_count' => $sales->where('status', 'voided')->count(),
            ]
        ]);
    }

    public function export(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $query = Sale::with(['items', 'payments.paymentMethod', 'user'])
            ->where('business_id', $businessId);

        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        $wantsJson = $request->wantsJson() || $request->boolean('format_json');
        if ($wantsJson) {
            $sales = $query->get()->map(function (Sale $sale) {
                $primaryPayment = $sale->payments->first();

                return [
                    'id' => $sale->id,
                    'status' => $sale->status,
                    'total_amount' => $sale->total_amount,
                    'created_at' => $sale->created_at,
                    'closed_at' => $sale->closed_at,
                    'items' => $sale->items,
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
                ];
            });

            return response()->json(['success' => true, 'data' => $sales]);
        }

        return new StreamedResponse(function() use ($query) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Date', 'Total', 'Status', 'User']);

            $query->chunk(100, function($sales) use ($handle) {
                foreach ($sales as $sale) {
                    fputcsv($handle, [
                        $sale->id, 
                        $sale->created_at, 
                        $sale->total_amount, 
                        $sale->status,
                        $sale->user?->name
                    ]);
                }
            });
            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="sales.csv"',
        ]);
    }
}
