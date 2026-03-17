<?php

use App\Http\Controllers\DocumentationController;
use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/', [DocumentationController::class, 'index']);
Route::get('/health', HealthController::class);
Route::get('/openapi/public.json', [DocumentationController::class, 'openApiPublic']);
Route::get('/openapi/protected.json', [DocumentationController::class, 'openApiProtected']);
