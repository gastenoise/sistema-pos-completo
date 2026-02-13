<?php

namespace App\Actions\Business;

use App\Models\Business;

class UpdateBusinessAction
{
    public function execute(Business $business, array $attributes, ?array $parametersPayload, bool $canUseBusinessParameters): Business
    {
        if (array_key_exists('color', $attributes) && is_string($attributes['color'])) {
            $attributes['color'] = strtoupper($attributes['color']);
        }

        $business->fill($attributes);
        $business->save();

        if ($canUseBusinessParameters && is_array($parametersPayload)) {
            foreach ($parametersPayload as $parameterId => $enabled) {
                if (!$enabled) {
                    $business->parameters()->where('parameter_id', $parameterId)->delete();
                    continue;
                }

                $business->parameters()->updateOrCreate(
                    ['parameter_id' => $parameterId],
                    []
                );
            }
        }

        return $business->fresh();
    }
}
