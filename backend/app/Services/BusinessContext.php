<?php

namespace App\Services;

class BusinessContext
{
    private ?int $businessId = null;

    public function setBusinessId(int $id): void
    {
        $this->businessId = $id;
    }

    public function getBusinessId(): ?int
    {
        return $this->businessId;
    }
    
    public function check(): bool
    {
        return !is_null($this->businessId);
    }
}