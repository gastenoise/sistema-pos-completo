<?php

namespace Tests\Feature;

use App\Actions\Business\BootstrapBusinessAction;
use App\Models\Business;
use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BootstrapBusinessActionTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_bootstraps_default_categories_for_business_automatically(): void
    {
        // Al crear el negocio, el Observer debería disparar el BootstrapBusinessAction
        $business = Business::create([
            'name' => 'Comercio Categorias Auto',
            'currency' => 'ARS',
        ]);

        $expectedCategories = [
            'General',
            'Alimentos',
            'Bebidas',
            'Cigarrillos',
            'Limpieza',
            'Servicio',
            'Comisión',
            'Otros',
        ];

        foreach ($expectedCategories as $categoryName) {
            $this->assertDatabaseHas('categories', [
                'business_id' => $business->id,
                'name' => $categoryName,
            ]);
        }

        $this->assertEquals(count($expectedCategories), Category::where('business_id', $business->id)->count());

        // Verificar el icono de Cigarrillos específicamente
        $this->assertDatabaseHas('categories', [
            'business_id' => $business->id,
            'name' => 'Cigarrillos',
            'icon' => 13,
        ]);

        // También verificar que los permisos se crearon (ya que BootstrapBusinessAction ahora los incluye)
        $this->assertDatabaseHas('business_role_permissions', [
            'business_id' => $business->id,
            'role' => 'owner',
        ]);
    }
}
