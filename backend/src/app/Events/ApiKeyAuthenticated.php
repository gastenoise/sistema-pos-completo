<?php

namespace App\Events;

class ApiKeyAuthenticated
{
    public function __construct(public readonly int $apiKeyId) {}
}
