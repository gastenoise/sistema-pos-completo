<?php

namespace App\Observers;

use App\Models\Business;
use App\Actions\Business\BootstrapBusinessAction;

class BusinessObserver
{
    /**
     * Handle the Business "created" event.
     */
    public function created(Business $business): void
    {
        app(BootstrapBusinessAction::class)->execute($business);
    }
}
