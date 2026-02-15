<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Models\CashRegisterSession;

class CashRegisterSessionResource extends JsonResource
{
    /**
     * Transform the resource into an array for the status endpoint.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<string, mixed>
     */
    public function toArray($request)
    {
        /** @var ?CashRegisterSession $session */
        $session = $this->resource;
        
        return [
            'is_open' => (bool) $session,
            'session' => $session ? [
                'id' => (int) $session->id,
                'opened_at' => $session->opened_at,
                'opened_by' => $session->opener->id,
                'opened_by_name' => $session && $session->opener ? $session->opener->name : null,
                'opening_cash_amount' => (float) $session->opening_cash_amount,
                'status' => $session->status,
                'closed_at' => $session->closed_at,
            ] : null,
        ];
    }
}