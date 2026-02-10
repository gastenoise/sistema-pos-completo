<?php

namespace App\Policies;

use App\Models\ApiKey;
use App\Models\User;
use App\Services\BusinessContext;

class ApiKeyPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->canManageBusinessApiKeys($user);
    }

    public function create(User $user): bool
    {
        return $this->canManageBusinessApiKeys($user);
    }

    public function delete(User $user, ApiKey $apiKey): bool
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        return $this->canManageBusinessApiKeys($user)
            && (int) $apiKey->business_id === (int) $businessId;
    }

    private function canManageBusinessApiKeys(User $user): bool
    {
        $businessId = app(BusinessContext::class)->getBusinessId();

        if (is_null($businessId)) {
            return false;
        }

        return $user->hasRole('owner', $businessId) || $user->hasRole('admin', $businessId);
    }
}
