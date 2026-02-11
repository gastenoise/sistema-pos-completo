<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Item;
use App\Models\SaleItem;
use App\Models\CashRegisterSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Services\BusinessContext;

class SaleController extends Controller
{
    /**
     * Iniciar una nueva venta
     */
    public function store(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        // Verificar si el usuario tiene una caja abierta en este negocio
        $sessionQuery = CashRegisterSession::where('status', 'open')
            ->where('opened_by', Auth::id())
            ->where('business_id', $businessId);

        if ($request->filled('cash_register_session_id')) {
            $session = $sessionQuery
                ->where('id', $request->input('cash_register_session_id'))
                ->first();
        } else {
            $session = $sessionQuery
                ->latest()
                ->first();
        }

        if (!$session) {
            return response()->json([
                'success' => false,
                'error' => 'No active cash session',
                'code' => 'CASH_CLOSED'
            ], 422);
        }

        $sale = Sale::create([
            'cash_register_session_id' => $session->id,
            'user_id' => Auth::id(),
            'status' => 'open',
            'total_amount' => 0
        ]);

        return response()->json(['success' => true, 'data' => $sale]);
    }

    /**
     * Iniciar venta y cargar ítems en una sola acción.
     */
    public function start(Request $request)
    {
        $validated = $request->validate([
            'cash_register_session_id' => 'nullable|integer|exists:cash_register_sessions,id',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|integer|exists:items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price_override' => 'nullable|numeric|min:0',
        ]);

        $businessId = app(BusinessContext::class)->getBusinessId();

        $sessionQuery = CashRegisterSession::where('status', 'open')
            ->where('opened_by', Auth::id())
            ->where('business_id', $businessId);

        if (!empty($validated['cash_register_session_id'])) {
            $session = $sessionQuery
                ->where('id', $validated['cash_register_session_id'])
                ->first();
        } else {
            $session = $sessionQuery
                ->latest()
                ->first();
        }

        if (!$session) {
            return response()->json([
                'success' => false,
                'error' => 'No active cash session',
                'code' => 'CASH_CLOSED'
            ], 422);
        }

        $sale = DB::transaction(function () use ($session, $validated) {
            $sale = Sale::create([
                'cash_register_session_id' => $session->id,
                'user_id' => Auth::id(),
                'status' => 'open',
                'total_amount' => 0,
            ]);

            foreach ($validated['items'] as $rawItem) {
                $item = Item::findOrFail($rawItem['item_id']);
                $price = $rawItem['unit_price_override'] ?? $item->price;
                $quantity = (int) $rawItem['quantity'];

                $sale->items()->create([
                    'item_id' => $item->id,
                    'item_name_snapshot' => $item->name,
                    'unit_price_snapshot' => $price,
                    'quantity' => $quantity,
                    'total' => $price * $quantity,
                ]);
            }

            $sale->calculateTotal();

            return $sale->fresh()->load('items');
        });

        return response()->json(['success' => true, 'data' => $sale]);
    }

    /**
     * Obtener detalle de una venta
     */
    public function show(Sale $sale)
    {
        return response()->json([
            'success' => true,
            'data' => $sale->load(['items', 'payments.paymentMethod'])
        ]);
    }

    /**
     * Agregar ítem a la venta (con snapshots de precio y nombre)
     */
    public function addItem(Request $request, Sale $sale)
    {
        if ($sale->status !== 'open') {
            return response()->json(['success' => false, 'message' => 'Sale is not editable'], 400);
        }

        $validated = $request->validate([
            'item_id' => 'required|exists:items,id',
            'quantity' => 'required|integer|min:1',
            'unit_price_override' => 'nullable|numeric|min:0'
        ]);

        $item = Item::findOrFail($validated['item_id']);

        $price = $validated['unit_price_override'] ?? $item->price;
        $total = $price * $validated['quantity'];

        $sale->items()->create([
            'item_id' => $item->id,
            'item_name_snapshot' => $item->name,
            'unit_price_snapshot' => $price,
            'quantity' => $validated['quantity'],
            'total' => $total
        ]);

        $sale->calculateTotal();

        return response()->json(['success' => true, 'data' => $sale->load('items')]);
    }

    /**
     * Eliminar ítem de la venta
     */
    public function removeItem(Sale $sale, SaleItem $saleItem)
    {
        if ($sale->status !== 'open') abort(400, 'Sale is not editable');

        $saleItem->delete();
        $sale->calculateTotal();

        return response()->json(['success' => true, 'data' => $sale->load('items')]);
    }

    /**
     * Generar payload para QR ficticio de Mercado Pago
     */
    public function getPaymentQr(Sale $sale)
    {
        // Payload ficticio según requerimiento
        $qrString = "mp://checkout?amount={$sale->total_amount}&ref=SALE_{$sale->id}";

        return response()->json([
            'success' => true,
            'data' => [
                'qr_payload' => $qrString,
                'method' => 'mercado_pago_mock'
            ]
        ]);
    }

    /**
     * Cerrar la venta e imprimir estado final
     */
    public function close(Request $request, Sale $sale)
    {
        if ($sale->items()->count() === 0) {
            return response()->json(['success' => false, 'message' => 'Cannot close an empty sale'], 422);
        }

        $unconfirmedPayments = $sale->payments()->where('status', '!=', 'confirmed')->count();
        if ($unconfirmedPayments > 0) {
            return response()->json([
                'success' => false,
                'message' => 'All payments must be confirmed before closing sale',
            ], 422);
        }

        $totalPaid = $sale->payments()->where('status', 'confirmed')->sum('amount');
        if ($totalPaid < $sale->total_amount) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient confirmed payments',
                'pending' => $sale->total_amount - $totalPaid
            ], 422);
        }

        $sale->update([
            'status' => 'closed',
            'closed_at' => now()
        ]);

        return response()->json(['success' => true, 'message' => 'Sale finalized']);
    }


    /**
     * Obtener la última venta cerrada/voided del negocio actual
     */
    public function latestClosed(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        if (!$businessId) {
            return response()->json(['success' => false, 'message' => 'Business not selected'], 403);
        }

        $sale = Sale::with(['items.item.category', 'payments.paymentMethod', 'user'])
            ->where('business_id', $businessId)
            ->whereIn('status', ['closed', 'voided'])
            ->orderByRaw('COALESCE(closed_at, created_at) DESC')
            ->orderByDesc('id')
            ->first();

        if (!$sale) {
            return response()->json(['success' => true, 'data' => null]);
        }

        return response()->json([
            'success' => true,
            'data' => $sale,
        ]);
    }

    /**
     * Anular venta (Void)
     */
    public function void(Request $request, Sale $sale)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $user = Auth::user();

        if (!$businessId || !$user || !$sale->business_id || (int) $sale->business_id !== (int) $businessId) {
            return response()->json(['success' => false, 'message' => 'Sale not found'], 404);
        }

        if (!$user->hasRole('admin', $businessId)) {
            return response()->json(['success' => false, 'message' => 'Only admins can void sales'], 403);
        }

        $request->validate([
            'reason' => 'required|string|max:255'
        ]);

        if ($sale->status === 'voided') {
            return response()->json(['success' => false, 'message' => 'Sale already voided'], 400);
        }

        if ($sale->status !== 'closed') {
            return response()->json(['success' => false, 'message' => 'Only closed sales can be voided'], 400);
        }

        $sale->update([
            'status' => 'voided',
            'voided_at' => now(),
            'voided_by' => Auth::id(),
            'void_reason' => $request->reason
        ]);

        return response()->json(['success' => true, 'message' => 'Sale voided successfully']);
    }
}
