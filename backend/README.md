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

### Operación SEPA

#### 1) Local con Docker Compose (este repo)

1. **Confirmar `scheduler` activo** (ejecuta `php artisan schedule:run` cada 60s):
   ```bash
   docker compose ps scheduler
   docker compose logs -f scheduler
   ```
2. **Confirmar `queue` activo** (`php artisan queue:work --tries=3`):
   ```bash
   docker compose ps queue
   docker compose logs -f queue
   ```
   > `sepa:sync` encola `ProcessSepaSyncJob` salvo que se ejecute con `--sync`.
3. **Verificar variables obligatorias en `.env`**:
   - `SEPA_URL_LUNES`
   - `SEPA_URL_MARTES`
   - `SEPA_URL_MIERCOLES`
   - `SEPA_URL_JUEVES`
   - `SEPA_URL_VIERNES`
   - `SEPA_URL_SABADO`
   - `SEPA_URL_DOMINGO`

   Ejemplo de chequeo rápido:
   ```bash
   rg '^SEPA_URL_(LUNES|MARTES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO)=' .env
   ```
4. **Observar ejecución cerca de 15:30 AR** revisando logs de `scheduler` y `queue`.

#### 2) Local sin Docker

- Configurar cron del SO:
  ```cron
  * * * * * cd /ruta/backend && php artisan schedule:run >> storage/logs/scheduler.log 2>&1
  ```
- Correr worker en paralelo:
  ```bash
  php artisan queue:work --tries=3
  ```

#### 3) Producción recomendada

- Cron del sistema ejecutando `php artisan schedule:run` **cada minuto**.
- `queue:work` siempre vivo con **Supervisor/Systemd** (o **Laravel Horizon** si aplica).
- Timezone:
  - Recomendado: definir timezone explícita en el Scheduler:
    ```php
    Schedule::command('sepa:sync')->dailyAt('15:30')->timezone('America/Argentina/Buenos_Aires');
    ```
  - Además, alinear timezone de host/contenedor/PHP para evitar desfasajes.

#### 4) Checklist de verificación

- A las **15:30 AR** aparece ejecución en logs.
- Se crea registro en `sepa_import_runs`.
- No hay duplicados (una sola ejecución diaria).
- El día resuelto (`lunes..domingo`) coincide con la fecha argentina.

Comandos útiles de diagnóstico:
```bash
# Revisar próximas ejecuciones del scheduler
php artisan schedule:list

# Ejecutar importación de forma síncrona para diagnóstico inmediato
php artisan sepa:sync --sync

# Revisar últimas corridas registradas
php artisan tinker --execute="App\\Models\\SepaImportRun::query()->latest()->limit(5)->get(['id','day','date','status','started_at','finished_at'])->toArray();"
```

> Evitá configurar **más de un scheduler** para el mismo entorno (por ejemplo, cron + contenedor scheduler al mismo tiempo), para prevenir ejecuciones duplicadas.

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


## Convención de migraciones

- Las migraciones base están separadas por bounded context para evitar archivos monolíticos.
- Referencia y reglas de naming/granularidad: `database/migrations/README.md`.
- Toda contribución nueva debe seguir el esquema incremental por contexto y evitar "mega migraciones".
