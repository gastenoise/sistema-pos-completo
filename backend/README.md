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


- `--requested-date=YYYY-MM-DD` **no cambia el origen real del dataset** (la URL se sigue resolviendo por día). Se guarda sólo para auditoría en `sepa_import_runs.requested_date`.
- Endpoint manual `POST /system/sepa-sync` acepta `requested_date` en el body con el mismo criterio: es trazabilidad, no selector de fuente.

Comandos útiles de diagnóstico:
```bash
# Revisar próximas ejecuciones del scheduler
php artisan schedule:list

# Ejecutar importación de forma síncrona para diagnóstico inmediato
php artisan sepa:sync --sync --requested-date=2026-04-07

# Revisar últimas corridas registradas
php artisan tinker --execute="App\\Models\\SepaImportRun::query()->latest()->limit(5)->get(['id','day','requested_date','status','started_at','finished_at'])->toArray();"
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


## Producción en Render con frontend en Vercel (proxy `/api`)

Si el frontend usa Vercel rewrite/proxy (`/api/*` -> Render), en **Render** definir explícitamente estas variables (sin depender de defaults de `config/*.php`):

- `SANCTUM_STATEFUL_DOMAINS` con **todos** los hosts del frontend usados por clientes (custom domain, `www`, apex y previews si aplican).
  - Ejemplo: `app.example.com,www.example.com,example.com`
- `CORS_ALLOWED_ORIGINS` con orígenes HTTPS exactos del frontend.
  - Ejemplo: `https://app.example.com,https://www.example.com,https://example.com`
- `SESSION_DOMAIN` alineado con la arquitectura elegida (recomendado: dominio padre compartido).
  - Ejemplo: `.example.com`
- `SESSION_SECURE_COOKIE=true`
- `SESSION_SAMESITE=none`

Después del cambio de variables, durante deploy ejecutar cache de config:

```bash
php artisan config:clear && php artisan config:cache
```

Validación de login (DevTools → Network):

1. Confirmar `GET /api/sanctum/csrf-cookie`.
2. En la respuesta, revisar `Set-Cookie` con atributos esperados (`Secure`, `SameSite=None`, `Domain`).
3. Confirmar `POST /api/public/login` con header `X-XSRF-TOKEN` y header `Cookie` presentes.

