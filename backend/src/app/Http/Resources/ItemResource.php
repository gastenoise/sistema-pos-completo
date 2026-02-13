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
            'sku' => $this->sku,
            'price' => (float) $this->price,
            'presentation_quantity' => $this->presentation_quantity !== null ? (float) $this->presentation_quantity : null,
            'presentation_unit' => $this->presentation_unit,
            'brand' => $this->brand,
            'list_price' => $this->list_price !== null ? (float) $this->list_price : null,
            'type' => $this->type,
            'is_active' => (bool) $this->active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
