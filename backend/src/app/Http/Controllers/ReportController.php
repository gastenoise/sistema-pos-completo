<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use Illuminate\Http\Request;
use App\Services\BusinessContext;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
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
