<?php

namespace App\Observers;

use App\Models\User;
use Illuminate\Support\Facades\Log;

class UserObserver
{
    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        // Placeholder for future default user actions.
        // For now, we just log the user creation.
        Log::info("New user created: {$user->email}");
    }
}
