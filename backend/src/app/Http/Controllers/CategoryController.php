<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => Category::all()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:categories,name,NULL,id,business_id,' . session('current_business_id'),
            'color' => 'nullable|integer|min:1|max:12', // Ahora se valida la columna color (entre 1 y 12 según la migración)
        ]);

        $category = Category::create([
            'business_id' => session('current_business_id'),
            'name' => $validated['name'],
            'color' => $validated['color'] ?? 1,
        ]);

        return response()->json(['success' => true, 'data' => $category], 201);
    }

    public function destroy(Category $category)
    {
        $category->delete();
        return response()->json(['success' => true, 'message' => 'Category deleted']);
    }
}