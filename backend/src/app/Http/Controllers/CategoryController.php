<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use App\Services\BusinessContext;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => Category::all()]);
    }

    public function store(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:categories,name,NULL,id,business_id,' . $businessId,
            'color' => 'nullable|string', // Accept hex or numeric string
        ]);

        $category = Category::create([
            'business_id' => $businessId,
            'name' => $validated['name'],
            'color' => $this->resolveColorIndex($validated['color'] ?? null),
        ]);

        return response()->json(['success' => true, 'data' => $category], 201);
    }

    public function update(Request $request, Category $category)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $validated = $request->validate([
            'name' => 'sometimes|string|max:100|unique:categories,name,' . $category->id . ',id,business_id,' . $businessId,
            'color' => 'nullable|string',
        ]);

        if (array_key_exists('color', $validated)) {
            $validated['color'] = $this->resolveColorIndex($validated['color']);
        }

        $category->update($validated);
        return response()->json(['success' => true, 'data' => $category->fresh()]);
    }

    public function destroy(Category $category)
    {
        $category->delete();
        return response()->json(['success' => true, 'message' => 'Category deleted']);
    }

    private function resolveColorIndex(?string $color): int
    {
        if (!$color) {
            return 1;
        }

        if (is_numeric($color)) {
            $index = (int) $color;
            return $index > 0 ? $index : 1;
        }

        $colors = config('data.colors');
        $matchIndex = array_search(strtoupper($color), array_map('strtoupper', $colors), true);
        if ($matchIndex === false) {
            return 1;
        }

        return $matchIndex + 1;
    }
}
