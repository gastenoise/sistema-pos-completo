<?php

return [
    'max_upload_mb' => (int) env('ITEMS_IMPORT_MAX_UPLOAD_MB', 120),
    'allowed_file_mimes' => 'csv,txt',
];
