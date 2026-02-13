<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Http\Resources\CategoryResource;
use Illuminate\Http\Request;
use App\Services\BusinessContext;

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
            'color' => ['nullable', 'regex:/^#([A-Fa-f0-9]{6})$/'],
            'icon' => 'nullable|integer|min:1|max:30',
        ]);

        $payload = [
            'business_id' => $businessId,
            'name' => $validated['name'],
            'color' => strtoupper($validated['color'] ?? '#3B82F6'),
            'icon' => $validated['icon'] ?? 1,
        ];

        $category = Category::create($payload);

        return response()->json(['success' => true, 'data' => new CategoryResource($category)], 201);
    }

    public function update(Request $request, Category $category)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        $validated = $request->validate([
            'name' => 'sometimes|string|max:100|unique:categories,name,' . $category->id . ',id,business_id,' . $businessId,
            'color' => ['nullable', 'regex:/^#([A-Fa-f0-9]{6})$/'],
            'icon' => 'nullable|integer|min:1|max:30',
        ]);

        if (array_key_exists('color', $validated)) {
            $validated['color'] = strtoupper($validated['color'] ?? '#3B82F6');
        }

        $category->update($validated);
        return response()->json(['success' => true, 'data' => new CategoryResource($category->fresh())]);
    }

    public function destroy(Category $category)
    {
        $category->delete();
        return response()->json(['success' => true, 'message' => 'Category deleted']);
    }
}
