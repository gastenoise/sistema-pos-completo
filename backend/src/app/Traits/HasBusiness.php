<?php

namespace App\Traits;

use App\Models\Scopes\BusinessScope;
use App\Services\BusinessContext;

trait HasBusiness
{
    protected static function booted()
    {
        static::addGlobalScope(new BusinessScope);
        
        // Auto-assign business_id on create
        static::creating(function ($model) {
            $context = app(BusinessContext::class);
            if ($context->check() && !isset($model->business_id)) {
                $model->business_id = $context->getBusinessId();
            }
        });
    }
}