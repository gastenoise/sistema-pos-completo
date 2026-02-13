<?php

namespace App\Http\Requests\Concerns;

use App\Services\BusinessContext;

trait AuthorizesBusinessContext
{
    protected function currentBusinessId(): ?int
    {
        return app(BusinessContext::class)->getBusinessId();
    }

    protected function hasBusinessContext(): bool
    {
        return (bool) $this->currentBusinessId();
    }

    protected function userBelongsToCurrentBusiness(array $roles = []): bool
    {
        $user = $this->user();
        $businessId = $this->currentBusinessId();

        if (!$user || !$businessId) {
            return false;
        }

        $query = $user->businesses()->where('business_id', $businessId);

        if (!empty($roles)) {
            $query->wherePivotIn('role', $roles);
        }

        return $query->exists();
    }
}
