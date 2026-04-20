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

La sincronización SEPA ya no depende del scheduler: se ejecuta de forma manual cuando se invoca `php artisan sepa:sync`.

### Operación SEPA

#### 1) Local con Docker Compose (este repo)

1. **Confirmar `queue` activo** (`php artisan queue:work --tries=3`), si vas a correr `sepa:sync` sin `--sync`:
   ```bash
   docker compose ps queue
   docker compose logs -f queue
   ```
   > `sepa:sync` encola `ProcessSepaSyncJob` salvo que se ejecute con `--sync`.
2. **Verificar variables obligatorias en `.env`**:
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
3. **Ejecutar sincronización manual**:
   ```bash
   # Usa el link del día actual (lunes..domingo)
   php artisan sepa:sync --sync

   # Fuerza un día específico
   php artisan sepa:sync lunes --sync
   ```

#### 2) Local sin Docker

- Ejecutar manualmente cuando lo necesites:
  ```bash
  php artisan sepa:sync --sync
  php artisan sepa:sync lunes --sync
  ```
- Si querés modo asíncrono, mantener worker en paralelo:
  ```bash
  php artisan queue:work --tries=3
  ```

#### 3) Producción recomendada

- Ejecutar `php artisan sepa:sync` de forma manual (por consola o endpoint interno controlado).
- `queue:work` siempre vivo con **Supervisor/Systemd** (o **Laravel Horizon** si aplica) solo si usás modo asíncrono.

#### 4) Checklist de verificación

- Se crea registro en `sepa_import_runs` al disparar manualmente la sincronización.
- No hay corridas duplicadas para el mismo disparo manual.
- El día resuelto (`lunes..domingo`) coincide con el argumento provisto, o con la fecha actual si no se pasó argumento.


- `--requested-date=YYYY-MM-DD` **no cambia el origen real del dataset** (la URL se sigue resolviendo por día). Se guarda sólo para auditoría en `sepa_import_runs.requested_date`.
- Endpoint manual `POST /system/sepa-sync` acepta `requested_date` en el body con el mismo criterio: es trazabilidad, no selector de fuente.

Comandos útiles de diagnóstico:
```bash
# Ejecutar importación de forma síncrona para diagnóstico inmediato
php artisan sepa:sync lunes --sync --requested-date=2026-04-07

# Revisar últimas corridas registradas
php artisan tinker --execute="App\\Models\\SepaImportRun::query()->latest()->limit(5)->get(['id','day','requested_date','status','started_at','finished_at'])->toArray();"
```

> Si ejecutás el comando en modo asíncrono sin `--sync`, evitá dispararlo múltiples veces en paralelo para prevenir encolados innecesarios.

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

