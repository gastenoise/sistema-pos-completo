<?php

namespace App\Actions\Sales;

use App\Actions\Sales\Support\ResolveCatalogSaleItem;
use App\Models\CashRegisterSession;
use App\Models\Sale;
use App\Services\BusinessContext;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StartSaleAction
{
    public function __construct(private readonly ResolveCatalogSaleItem $resolveCatalogSaleItem)
    {
    }

    public function execute(array $validated): ?Sale
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        $sessionQuery = CashRegisterSession::where('status', 'open')
            ->where('opened_by', Auth::id())
            ->where('business_id', $businessId);

        $session = !empty($validated['cash_register_session_id'])
            ? $sessionQuery->where('id', $validated['cash_register_session_id'])->first()
            : $sessionQuery->latest()->first();

        if (!$session) {
            return null;
        }

        return DB::transaction(function () use ($session, $validated) {
            $sale = Sale::create([
                'cash_register_session_id' => $session->id,
                'user_id' => Auth::id(),
                'status' => 'open',
                'total_amount' => 0,
            ]);

            $itemsTotal = 0;
            foreach ($validated['items'] as $rawItem) {
                $quantity = (int) $rawItem['quantity'];

                if (!empty($rawItem['item_id']) || !empty($rawItem['sepa_item_id'])) {
                    $resolvedItem = $this->resolveCatalogSaleItem->execute($sale, $rawItem);
                    $lineTotal = $resolvedItem['unit_price_snapshot'] * $quantity;
                    $itemsTotal += $lineTotal;

                    $sale->items()->create([
                        'item_source' => $resolvedItem['item_source'],
                        'item_id' => $resolvedItem['item_id'],
                        'sepa_item_id' => $resolvedItem['sepa_item_id'],
                        'item_name_snapshot' => $resolvedItem['item_name_snapshot'],
                        'barcode_snapshot' => $resolvedItem['barcode_snapshot'],
                        'unit_price_snapshot' => $resolvedItem['unit_price_snapshot'],
                        'category_id_snapshot' => $resolvedItem['category_id_snapshot'],
                        'quantity' => $quantity,
                        'total' => $lineTotal,
                    ]);

                    continue;
                }

                $quickPrice = (float) ($rawItem['quick_item_price'] ?? 0);
                $price = (float) ($rawItem['unit_price_override'] ?? $quickPrice);
                $lineTotal = $price * $quantity;
                $itemsTotal += $lineTotal;

                $sale->items()->create([
                    'item_source' => 'quick',
                    'item_id' => null,
                    'sepa_item_id' => null,
                    'item_name_snapshot' => (string) $rawItem['quick_item_name'],
                    'barcode_snapshot' => null,
                    'unit_price_snapshot' => $price,
                    'category_id_snapshot' => $rawItem['quick_item_category_id'] ?? null,
                    'quantity' => $quantity,
                    'total' => $lineTotal,
                ]);
            }

            $paymentsTotal = 0;
            foreach ($validated['payments'] as $payment) {
                $amount = (float) $payment['amount'];
                $paymentsTotal += $amount;

                $sale->payments()->create([
                    'payment_method_id' => $payment['payment_method_id'],
                    'amount' => $amount,
                    'status' => 'pending',
                    'transaction_reference' => $payment['transaction_reference'] ?? null,
                ]);
            }

            if (abs($paymentsTotal - $itemsTotal) > 0.01) {
                throw ValidationException::withMessages([
                    'payments' => ['Payment division must match sale total'],
                ]);
            }

            $sale->calculateTotal();

            return $sale->fresh()->load(['items.item.category', 'items.sepaItem', 'items.categorySnapshot', 'payments.paymentMethod']);
        });
    }
}
