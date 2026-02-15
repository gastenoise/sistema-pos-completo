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
        return response()->json($this->loadSpec('public'));
    }

    private function loadSpec(string $name): array
    {
        $path = resource_path(sprintf('openapi/%s.json', $name));

        return json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    }

    private function renderDocs(string $title, string $openapiUrl): View
    {
        return view('api-docs', [
            'title' => $title,
            'openapiUrl' => $openapiUrl,
        ]);
    }
}
