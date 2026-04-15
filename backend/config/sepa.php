<?php

return [
    'day_urls' => [
        'lunes' => env('SEPA_URL_LUNES'),
        'martes' => env('SEPA_URL_MARTES'),
        'miercoles' => env('SEPA_URL_MIERCOLES'),
        'jueves' => env('SEPA_URL_JUEVES'),
        'viernes' => env('SEPA_URL_VIERNES'),
        'sabado' => env('SEPA_URL_SABADO'),
        'domingo' => env('SEPA_URL_DOMINGO'),
    ],
    'chunk_size' => (int) env('SEPA_IMPORT_CHUNK_SIZE', 1000),
    'http_timeout' => (int) env('SEPA_HTTP_TIMEOUT', 120),
    'lock_ttl_seconds' => (int) env('SEPA_IMPORT_LOCK_TTL_SECONDS', 7200),
];
