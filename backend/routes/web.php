<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DocumentationController;

Route::get('/', [DocumentationController::class, 'index']);
Route::get('/openapi/public.json', [DocumentationController::class, 'openApiPublic']);
