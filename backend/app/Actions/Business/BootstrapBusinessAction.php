<?php

namespace App\Actions\Business;

use App\Models\Business;
use App\Models\BusinessParameter;
use App\Models\Category;

class BootstrapBusinessAction
{
    public function execute(Business $business): void
    {
        // 1. Bootstrapear roles y permisos
        app(BootstrapBusinessRolePermissionsAction::class)->execute($business->id);

        // 2. Bootstrapear categorías por defecto
        $defaultCategories = [
            ['name' => 'General',    'color' => '#3B82F6', 'icon' => 1],  // Package
            ['name' => 'Alimentos',  'color' => '#10B981', 'icon' => 15], // Apple
            ['name' => 'Bebidas',    'color' => '#F59E0B', 'icon' => 3],  // Coffee
            ['name' => 'Cigarrillos', 'color' => '#6B7280', 'icon' => 13], // Cigarette
            ['name' => 'Limpieza',   'color' => '#8B5CF6', 'icon' => 22], // Scissors (closest match for cleaning)
            ['name' => 'Librería',   'color' => '#6366F1', 'icon' => 8],  // Book
            ['name' => 'Servicio',   'color' => '#3B82F6', 'icon' => 9],  // Wrench
            ['name' => 'Comisión',   'color' => '#F59E0B', 'icon' => 26], // Tag
            ['name' => 'Otros',      'color' => '#EF4444', 'icon' => 24], // Star
        ];

        foreach ($defaultCategories as $category) {
            Category::firstOrCreate([
                'business_id' => $business->id,
                'name' => $category['name'],
            ], [
                'color' => $category['color'],
                'icon' => $category['icon'],
            ]);
        }

        // 3. Activar escáner de código de barras por defecto
        $business->parameters()->firstOrCreate([
            'parameter_id' => BusinessParameter::ENABLE_BARCODE_SCANNER,
        ]);

        // 4. Activar creación automática desde código desconocido por defecto
        $business->parameters()->firstOrCreate([
            'parameter_id' => BusinessParameter::AUTO_OPEN_ITEM_CREATE_ON_UNKNOWN_BARCODE,
        ]);
    }
}
