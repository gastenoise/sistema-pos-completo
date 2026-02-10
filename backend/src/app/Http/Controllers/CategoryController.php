<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Http\Resources\CategoryResource;
use Illuminate\Http\Request;
use App\Services\BusinessContext;
use Illuminate\Support\Facades\Schema;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => CategoryResource::collection(Category::all())]);
    }

    public function store(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:categories,name,NULL,id,business_id,' . $businessId,
            'color' => 'nullable|string', // Accept hex or numeric string
            'icon' => 'nullable|string|max:100',
        ]);

        $colorPayload = $this->resolveColorPayload($validated['color'] ?? null);

        $payload = [
            'business_id' => $businessId,
            'name' => $validated['name'],
            'color' => $colorPayload['color_index'],
        ];

        if (Schema::hasColumn('categories', 'color_hex')) {
            $payload['color_hex'] = $colorPayload['color_hex'];
        }

        if (Schema::hasColumn('categories', 'icon')) {
            $payload['icon'] = $validated['icon'] ?? null;
        }

        $category = Category::create($payload);

        return response()->json(['success' => true, 'data' => new CategoryResource($category)], 201);
    }

    public function update(Request $request, Category $category)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $validated = $request->validate([
            'name' => 'sometimes|string|max:100|unique:categories,name,' . $category->id . ',id,business_id,' . $businessId,
            'color' => 'nullable|string',
            'icon' => 'nullable|string|max:100',
        ]);

        if (array_key_exists('color', $validated)) {
            $colorPayload = $this->resolveColorPayload($validated['color']);
            $validated['color'] = $colorPayload['color_index'];
            if (Schema::hasColumn('categories', 'color_hex')) {
                $validated['color_hex'] = $colorPayload['color_hex'];
            }
        }

        if (!Schema::hasColumn('categories', 'icon')) {
            unset($validated['icon']);
        }

        $category->update($validated);
        return response()->json(['success' => true, 'data' => new CategoryResource($category->fresh())]);
    }

    public function destroy(Category $category)
    {
        $category->delete();
        return response()->json(['success' => true, 'message' => 'Category deleted']);
    }

    private function resolveColorPayload(?string $color): array
    {
        if (!$color) {
            return [
                'color_index' => 1,
                'color_hex' => null,
            ];
        }

        if (is_numeric($color)) {
            $index = (int) $color;
            $index = $index > 0 ? $index : 1;
            $colors = config('data.colors');
            $hex = $colors[$index - 1] ?? $colors[0] ?? null;
            return [
                'color_index' => $index,
                'color_hex' => $hex,
            ];
        }

        $colors = config('data.colors');
        $matchIndex = array_search(strtoupper($color), array_map('strtoupper', $colors), true);
        if ($matchIndex === false) {
            return [
                'color_index' => 1,
                'color_hex' => $color,
            ];
        }

        return [
            'color_index' => $matchIndex + 1,
            'color_hex' => $color,
        ];
    }
}
