# API alignment plan (protected/public + frontend)

## Source of truth y alcance

- **Rutas reales del backend:** `backend/routes/api.php`.
- **Contratos OpenAPI actuales:**
  - `backend/resources/openapi/protected.json`
  - `backend/resources/openapi/public.json`
- **Cliente HTTP del frontend:** `frontend/src/api/client.js`.

> Nota: este documento reemplaza referencias antiguas del tipo `backend/src/routes/api.php`.

## Inventario vigente de endpoints

### Protected (sesión/token)

Prefijo base: `/protected`

- **Auth (sin business):**
  - `POST /auth/login`
  - `POST /auth/register`
  - `GET /auth/me`
  - `PUT /auth/me`
  - `POST /auth/logout`
  - `PUT /auth/change-password`
- **Contexto de negocio (sin `resolve.business`):**
  - `GET /businesses`
  - `POST /businesses/select`
  - `POST /navigation-events`
  - `GET /payment-methods/all`
  - `GET /info/colors`
  - `GET /info/payment-methods`
- **Business-scoped (`resolve.business`):**
  - `GET /auth/permissions`
  - `PUT /business`
  - `GET|PUT /business/smtp`
  - `GET /business/smtp/status`
  - `POST /business/smtp/test`
  - `GET|PUT /business/role-permissions`
  - `GET|POST|DELETE /api-keys`
  - `categories` (resource)
  - `GET|PUT /banks`
  - `GET|POST|PUT /payment-methods`
  - `PATCH /items/bulk`
  - `PUT /sepa-items/{sepaItem}/price`
  - `items` (resource parcial)
  - `POST /items-import/preview|preview/full|confirm`
  - `cash-register`: `status`, `open`, `close`, `sessions/closed`, `{session}/expected-totals`
  - `sales`: `start`, `latest-closed`, CRUD operativo de items/pagos, `qr`, `close`, `void`, ticket + email + whatsapp
  - `reports`: `daily-summary`, `sales`, `summary`, `export`

### Public (API Key)

Prefijo base: `/public` (middleware `auth.apikey`)

- `payment-methods/all`
- `info/colors`, `info/payment-methods`
- `categories` (resource)
- `GET|PUT banks`
- `GET|POST|PUT payment-methods`
- `items` (resource parcial)
- `items-import/preview|preview/full|confirm`
- `cash-register/status|open|close|{session}/expected-totals`
- `sales` (flujo operativo + ticket)
- `reports/daily-summary|sales|summary|export`

## Correcciones realizadas en documentación

1. Se corrigieron rutas de archivo obsoletas (`backend/src/...` → `backend/...`).
2. Se consolidó el inventario de endpoints según `backend/routes/api.php` vigente.
3. Se dejó explícito que el cliente frontend usa `X-Business-Id` desde `frontend/src/api/client.js` para rutas business-scoped.

## Regla operativa: **doc update required**

Cuando se cambie alguno de estos elementos, el PR **debe** incluir actualización documental en el mismo commit/PR:

- paths de archivos públicos de referencia (ej. rutas, módulos, controllers clave),
- endpoints (path, método, middleware o contrato request/response),
- encabezados/estrategia de autenticación (`X-Business-Id`, API Key, cookies CSRF).

Checklist mínima de PR:

- [ ] `backend/docs/api-alignment-plan.md` actualizado (si cambió API/paths backend).
- [ ] `frontend/README.md` actualizado (si cambió arquitectura frontend, módulos, rutas o integración API).
- [ ] OpenAPI (`protected.json`/`public.json`) actualizado si cambió contrato.
