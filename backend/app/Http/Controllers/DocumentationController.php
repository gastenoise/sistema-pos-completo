<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\View\View;

class DocumentationController extends Controller
{
    public function index(): View
    {
        return $this->renderDocs('Pública', url('/openapi/public.json'));
    }

    public function openApiPublic(): JsonResponse
    {
        return response()->json($this->loadSpecForPrefix('/public/'));
    }

    public function openApiProtected(): JsonResponse
    {
        return response()->json($this->loadSpecForPrefix('/protected/'));
    }

    private function loadSpecForPrefix(string $prefix): array
    {
        $path = resource_path('openapi/source.json');
        $spec = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

        $spec['paths'] = array_filter(
            $spec['paths'] ?? [],
            static fn (string $routePath): bool => str_starts_with($routePath, $prefix),
            ARRAY_FILTER_USE_KEY,
        );

        $spec['servers'] = [
            ['url' => config('app.url')],
        ];

        return $spec;
    }

    private function renderDocs(string $title, string $openapiUrl): View
    {
        return view('api-docs', [
            'title' => $title,
            'openapiUrl' => $openapiUrl,
        ]);
    }
}
