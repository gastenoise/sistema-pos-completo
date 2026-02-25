# API alignment plan (protected/public + frontend)

## 1) Contrato API: inventario y “source of truth”

**Source of truth actual**
- Rutas reales en backend: `routes/api.php` define todo lo expuesto para `protected` y `public`.【F:backend/src/routes/api.php†L1-L189】
- OpenAPI disponible para `protected` en `resources/openapi/protected.json` (sirve como base para documentación y pruebas).【F:backend/src/resources/openapi/protected.json†L1-L156】

**Inventario mínimo sugerido (por contexto de negocio)**
- **Protected (sin business)**: auth (login/register/me/updates), selección de negocio, info y payment-methods (all).【F:backend/src/routes/api.php†L25-L66】
- **Protected (business-scoped)**: business update, api-keys, categories, banks, payment-methods, items, items-import, navigation-events, cash-register, sales, reports.【F:backend/src/routes/api.php†L70-L141】
- **Public (API key)**: payment-methods/all, info, categories, banks, payment-methods, items, items-import, cash-register, sales, reports.【F:backend/src/routes/api.php†L151-L189】

**Entregable**
- Mantener esta tabla y las rutas completas (método + path + auth + contexto + payload/response) en este documento y/o extenderla en un README dedicado para el backend.

## 2) Corregir inconsistencias de rutas entre backend y frontend

**Caja – sesiones cerradas**
- Backend expone `GET /protected/cash-register/sessions/closed`.【F:backend/src/routes/api.php†L111-L117】
- Frontend estaba consumiendo `GET /protected/cash-register/closed-sessions`, por lo que se alineó a `sessions/closed`.【F:frontend/src/pages/CashRegister.jsx†L59-L66】

**Bancos**
- Backend sólo expone `GET /protected/banks` y `PUT /protected/banks`.【F:backend/src/routes/api.php†L86-L88】
- Frontend ahora usa únicamente `PUT /protected/banks` para crear/actualizar (el backend crea si no existe).【F:frontend/src/pages/Settings.jsx†L300-L315】

## 3) Estándar de contexto de negocio (X-Business-Id)

**Frontend**
- El cliente agrega `X-Business-Id` cuando hay negocio seleccionado, junto con el token si existe.【F:frontend/src/api/client.js†L73-L113】

**Backend**
- `resolve.business` exige `X-Business-Id` y valida pertenencia del usuario, devolviendo 403 si falta o es inválido.【F:backend/src/app/Http/Middleware/ResolveBusiness.php†L21-L57】

**Acción recomendada**
- Mantener mensajes de error consistentes para 403/401 entre protected/public y en UI mapearlos a un fallback claro (re-selección de negocio o login).

## 4) Paridad y disponibilidad en API pública

**Cobertura actual**
- La API pública ya incluye endpoints clave de POS: items, categorías, ventas, caja, reportes, payment-methods y bancos.【F:backend/src/routes/api.php†L151-L189】
- Usa API key con `X-Api-Key` (o `Authorization: ApiKey`) y setea business_id automáticamente.【F:backend/src/app/Http/Middleware/AuthenticateApiKey.php†L15-L58】

**Acción recomendada**
- Documentar explícitamente qué endpoints quedan fuera de `public` (por seguridad o negocio) y registrar el rationale.
- Asegurar que los mensajes de error para API key faltante/ inválida o business context sean consistentes.

## 5) Ajustes del frontend para consumo correcto de protected

**Acciones completadas**
- Rutas corregidas para caja (sessions/closed) y bancos (PUT).【F:frontend/src/pages/CashRegister.jsx†L59-L66】【F:frontend/src/pages/Settings.jsx†L300-L315】

**Checklist adicional (payloads/errores)**
- Verificar payloads esperados en: `items-import/preview|confirm`, `sales` + `payments`, `cash-register open/close`.
- Revisar manejo de errores 401/403 y redirección limpia (login/selección de negocio) en el frontend.

## 6) Validación final

**Checklist manual sugerido**
- Login → selección de negocio → POS (items, ventas, caja)
- Settings (bancos, categorías, métodos de pago)
- Reportes (export)

**Pruebas opcionales**
- Smoke test con llamadas mínimas a endpoints protected/public (script local o colección Postman) usando el contrato anterior.


## 7) Diferencias explícitas protected vs public (rutas exclusivas)

Con el registro modular por dominio, las rutas compartidas viven en registrars reutilizables y las diferencias quedan declaradas con flags (`includeProtectedOnly`).

**Exclusivas de `protected` (no se exponen en `public`)**
- `GET /protected/cash-register/sessions/closed`
- `PATCH /protected/items/bulk`
- `PUT /protected/sepa-items/{sepaItem}/price`
- `POST /protected/sales/{sale}/ticket/email`
- `GET /protected/sales/{sale}/ticket/email-status/{requestId}`
- `POST /protected/sales/{sale}/ticket/share/whatsapp/file`
- `POST /protected/sales/{sale}/ticket/share/whatsapp`
- Rutas de autenticación de usuario final, selección de negocio, permisos de rol y administración de API keys.

**Fuente única OpenAPI**
- `resources/openapi/source.json` define la especificación base.
- `DocumentationController` filtra por prefijo (`/public/` o `/protected/`) para servir `/openapi/public.json` y `/openapi/protected.json` desde el mismo archivo origen.
