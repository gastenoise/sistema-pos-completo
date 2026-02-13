<?php

namespace App\Http\Controllers;

use App\Actions\Sales\AddItemToSaleAction;
use App\Actions\Sales\CloseSaleAction;
use App\Actions\Sales\CreateSaleAction;
use App\Actions\Sales\GetLatestClosedSaleAction;
use App\Actions\Sales\StartSaleAction;
use App\Actions\Sales\VoidSaleAction;
use App\Http\Requests\SaleAddItemRequest;
use App\Http\Requests\SaleStartRequest;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\BusinessContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SaleController extends Controller
{
    public function store(Request $request, CreateSaleAction $createSaleAction)
    {
        $sale = $createSaleAction->execute(
            $request->filled('cash_register_session_id') ? (int) $request->input('cash_register_session_id') : null
        );

        if (!$sale) {
            return response()->json([
                'success' => false,
                'error' => 'No active cash session',
                'code' => 'CASH_CLOSED',
            ], 422);
        }

        return response()->json(['success' => true, 'data' => $sale]);
    }

    public function start(SaleStartRequest $request, StartSaleAction $startSaleAction)
    {
        $validated = $request->validated();

        $sale = $startSaleAction->execute($validated);

        if (!$sale) {
            return response()->json([
                'success' => false,
                'error' => 'No active cash session',
                'code' => 'CASH_CLOSED',
            ], 422);
        }

        return response()->json(['success' => true, 'data' => $sale]);
    }

    public function show(Sale $sale)
    {
        return response()->json([
            'success' => true,
            'data' => $sale->load(['items.item.category', 'items.categorySnapshot', 'payments.paymentMethod']),
        ]);
    }

    public function addItem(SaleAddItemRequest $request, Sale $sale, AddItemToSaleAction $addItemToSaleAction)
    {
        if ($sale->status !== 'open') {
            return response()->json(['success' => false, 'message' => 'Sale is not editable'], 400);
        }

        $validated = $request->validated();

        $sale = $addItemToSaleAction->execute($sale, $validated);

        return response()->json(['success' => true, 'data' => $sale]);
    }

    public function removeItem(Sale $sale, SaleItem $saleItem)
    {
        $this->authorize('update', $sale);

        if ($sale->status !== 'open') {
            abort(400, 'Sale is not editable');
        }

        if ((int) $saleItem->sale_id !== (int) $sale->id) {
            abort(404, 'Sale item not found for this sale');
        }

        $saleItem->delete();
        $sale->calculateTotal();

        return response()->json(['success' => true, 'data' => $sale->load(['items.item.category', 'items.categorySnapshot'])]);
    }

    public function getPaymentQr(Sale $sale)
    {
        $qrString = "mp://checkout?amount={$sale->total_amount}&ref=SALE_{$sale->id}";

        return response()->json([
            'success' => true,
            'data' => [
                'qr_payload' => $qrString,
                'method' => 'mercado_pago_mock',
            ],
        ]);
    }

    public function close(Request $request, Sale $sale, CloseSaleAction $closeSaleAction)
    {
        $result = $closeSaleAction->execute($sale);

        $status = $result['status'];
        unset($result['status']);

        return response()->json($result, $status);
    }

    public function latestClosed(Request $request, GetLatestClosedSaleAction $getLatestClosedSaleAction)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        if (!$businessId) {
            return response()->json(['success' => false, 'message' => 'Business not selected'], 403);
        }

        $sale = $getLatestClosedSaleAction->execute($businessId);

        return response()->json([
            'success' => true,
            'data' => $sale,
        ]);
    }

    public function void(Request $request, Sale $sale, VoidSaleAction $voidSaleAction)
    {
        $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        $result = $voidSaleAction->execute(
            $sale,
            Auth::user(),
            app(BusinessContext::class)->getBusinessId(),
            $request->string('reason')->toString()
        );

        $status = $result['status'];
        unset($result['status']);

        return response()->json($result, $status);
    }
}
