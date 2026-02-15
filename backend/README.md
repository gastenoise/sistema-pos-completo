# Laravel 12 Multi-Business POS MVP

## Requisitos
- Docker & Docker Compose
- Make (opcional, ver Makefile)

## Instalación

1. **Construir contenedores:**
```bash
make up
```
Instalar dependencias y Configurar entorno:

Bash

# Dentro del contenedor app
```bash
docker compose exec app composer install
cp .env.example .env
```
# Configura DB_HOST=db, DB_DATABASE=laravel, DB_USERNAME=root, DB_PASSWORD=secret
```bash
docker compose exec app php artisan key:generate
```
Base de Datos:

Bash
```bash
docker compose exec app php artisan migrate --seed
```
Uso
API: Accesible en http://localhost:8080 con rutas /protected y /public (el subdominio api será separado).

Autenticación:

Registrar usuario o usar el seeder (admin@example.com / password)

Login devuelve token.

Listar negocios (GET /protected/businesses)

Seleccionar negocio (POST /protected/businesses/select) -> devuelve success.

Usar endpoints de Items/Ventas enviando X-Business-Id header (o confiando en la sesión).

Scheduler & Queue
El docker-compose.yml levanta un contenedor queue y scheduler.

Para deshabilitar cron, comentar el servicio scheduler en docker-compose.yml.

Tests
Ejecutar make test para correr Pest/PHPUnit.

## Convención de naming API (catálogo)

- Para recursos de catálogo (`items`, `categories`) el estado de activación expuesto por API debe llamarse `is_active`.
- El campo de base de datos puede seguir siendo `active`, pero no debe exponerse directamente en respuestas nuevas.
- Durante migraciones de clientes, los consumidores pueden mantener un adaptador temporal que acepte ambos (`is_active` y `active`).
- Todo endpoint nuevo que devuelva catálogo debe serializar este flag con `is_active` para mantener consistencia.


#### Ejemplo de Test (`tests/Feature/SaleFlowTest.php`)

```php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Business;
use App\Models\Item;
use App\Models\CashRegisterSession;

class SaleFlowTest extends TestCase
{
    public function test_can_create_sale_if_cash_open()
    {
        $user = User::factory()->create();
        $business = Business::factory()->create();
        $user->businesses()->attach($business, ['role' => 'owner']);
        
        $this->actingAs($user);
        
        // Set Context
        $this->postJson('/protected/businesses/select', ['business_id' => $business->id]);
        
        // Open Cash
        CashRegisterSession::create([
            'business_id' => $business->id,
            'opened_by' => $user->id,
            'opened_at' => now(),
            'opening_cash_amount' => 100,
            'status' => 'open'
        ]);
        
        // Create Sale
        $response = $this->postJson('/protected/sales', [], ['X-Business-Id' => $business->id]);
        
        $response->assertStatus(200)
                 ->assertJsonPath('success', true);
    }
}
```
