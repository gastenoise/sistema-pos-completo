<?php

namespace App\Services;

use App\Models\Sale;

class SaleTicketService
{
    private const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

    public function build(Sale $sale): array
    {
        $sale->loadMissing([
            'items',
            'payments.paymentMethod',
            'user',
            'cashRegisterSession',
            'business',
        ]);

        return [
            'id' => $sale->id,
            'status' => $sale->status,
            'business' => [
                'id' => $sale->business?->id,
                'name' => $sale->business?->name,
                'address' => $sale->business?->address,
                'phone' => $sale->business?->phone,
                'tax_id' => $sale->business?->tax_id,
            ],
            'date' => [
                'created_at' => $this->toArgentinaIsoDate($sale->created_at),
                'closed_at' => $this->toArgentinaIsoDate($sale->closed_at),
            ],
            'cash_register' => [
                'session_id' => $sale->cashRegisterSession?->id,
                'opened_at' => $this->toArgentinaIsoDate($sale->cashRegisterSession?->opened_at),
                'closed_at' => $this->toArgentinaIsoDate($sale->cashRegisterSession?->closed_at),
                'status' => $sale->cashRegisterSession?->status,
            ],
            'seller' => [
                'id' => $sale->user?->id,
                'name' => $sale->user?->name,
                'email' => $sale->user?->email,
            ],
            'items' => $sale->items->map(fn ($item) => [
                'id' => $item->id,
                'item_id' => $item->item_id,
                'name' => $item->item_name_snapshot,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price_snapshot,
                'total' => (float) $item->total,
            ])->values()->all(),
            'payments' => $sale->payments->map(fn ($payment) => [
                'id' => $payment->id,
                'method' => $payment->paymentMethod?->name,
                'status' => $payment->status,
                'amount' => (float) $payment->amount,
                'transaction_reference' => $payment->transaction_reference,
                'confirmed_at' => $this->toArgentinaIsoDate($payment->confirmed_at),
            ])->values()->all(),
            'total' => [
                'amount' => (float) $sale->total_amount,
            ],
        ];
    }

    private function toArgentinaIsoDate($date): ?string
    {
        if (!$date) {
            return null;
        }

        return $date->copy()->setTimezone(self::ARGENTINA_TIMEZONE)->toIso8601String();
    }
}
