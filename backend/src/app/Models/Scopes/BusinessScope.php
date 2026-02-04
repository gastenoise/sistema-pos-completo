<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use App\Services\BusinessContext;

class BusinessScope implements Scope
{
    /**
     * Aplicar el scope al constructor de consultas.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $builder
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return void
     */
    public function apply(Builder $builder, Model $model): void
    {
        $context = app(BusinessContext::class);
        
        if ($context->check()) {
            // Usamos $model->getTable() para evitar ambigüedad en Joins
            $builder->where($model->getTable() . '.business_id', $context->getBusinessId());
        }
    }
}