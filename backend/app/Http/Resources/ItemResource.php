<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'business_id' => (int) $this->business_id,
            'category_id' => $this->category_id !== null ? (int) $this->category_id : null,
            'name' => $this->name,
            'sku' => ($this->source ?? 'local') === 'sepa' ? null : $this->sku,
            'barcode' => $this->barcode,
            'price' => (float) $this->price,
            'presentation_quantity' => $this->presentation_quantity !== null ? (float) $this->presentation_quantity : null,
            'presentation_unit' => $this->presentation_unit,
            'brand' => $this->brand,
            'list_price' => $this->list_price !== null ? (float) $this->list_price : null,
            'is_active' => (bool) ($this->is_active ?? $this->active),
            'source' => $this->source ?? 'local',
            'sepa_item_id' => $this->sepa_item_id !== null ? (int) $this->sepa_item_id : null,
            'is_price_overridden' => (bool) ($this->is_price_overridden ?? false),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
