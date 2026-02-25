# Frontend local setup

## About

This frontend communicates directly with the backend API configured in your environment variables.

## Prerequisites

1. Clone the repository.
2. Navigate to the `frontend/` directory.
3. Install dependencies: `npm install`.
4. Create an `.env.local` file with:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

Run the app:

```bash
npm run dev
```

## Backend integration

- Start backend API locally and point `VITE_API_BASE_URL` to that backend.
- API calls are made through `src/api/client.js`.
- For protected business-scoped endpoints, the client sends `X-Business-Id` when there is a selected business in context/localStorage.

---

## Estado de migración frontend (legacy vs modular)

### Estado actual

- **Routing app-level** sigue en estructura legacy de páginas (`src/pages/*`) y configuración central (`src/pages.config.js`, `src/App.jsx`).
- Las páginas principales (`POS`, `Items`, `Reports`, `Settings`, `CashRegister`) ya son **wrappers** que delegan en módulos (`src/modules/*`).
- Existen artefactos legacy (componentes y lógica histórica en `src/components/*`, `src/pages/*`, `src/api/*`) que todavía conviven con la estructura modular.

### Decisión de destino

La dirección oficial es **arquitectura modular por dominio**:

- `src/modules/<dominio>/components`
- `src/modules/<dominio>/hooks`
- `src/modules/<dominio>/api`

Las páginas legacy deben quedar como capa de compatibilidad temporal, con objetivo de minimizar su responsabilidad a “entrypoints/wrappers”.

---

## Mapa arquitectónico corto

- **Dominio (frontend):** `src/modules/*` (POS, items, reports, settings, cash-register).
- **UI compartida:**
  - `src/components/ui/*` (design system / primitives)
  - `src/components/common/*` (componentes cross-feature)
- **API cliente y contratos de consumo:**
  - Base client: `src/api/client.js`
  - Helpers de API legacy: `src/api/*`
  - API por dominio (target): `src/modules/*/api/*`
- **Recursos compartidos (utilidades/contextos):**
  - `src/lib/*`
  - `src/hooks/*`
  - `src/utils/*`

---

## Regla operativa: **doc update required**

Si un PR cambia **rutas de archivos**, **endpoints consumidos**, o **contratos API** (payload/response/códigos), entonces debe incluir actualización de documentación en el mismo PR.

Checklist mínima:

- [ ] Actualizar este `frontend/README.md` si cambió arquitectura/rutas/capas frontend.
- [ ] Actualizar `backend/docs/api-alignment-plan.md` si cambió inventario o contrato de endpoints.
- [ ] Si aplica, actualizar OpenAPI del backend (`backend/resources/openapi/*.json`).

---

## Timezone policy

- Keep the backend default Laravel timezone unchanged.
- The frontend must always render date/time values using the browser timezone through helpers in `src/lib/dateTime.js`.
- Do not hardcode `America/Argentina/Buenos_Aires` in UI components/pages.
- Do not use `toLocaleDateString`, `toLocaleString`, or `Intl.DateTimeFormat` directly in UI components/pages; use `lib/dateTime` helpers instead.

## npm audit (devDependencies)

`npm audit` may report vulnerabilities in **ajv** and **minimatch** coming from ESLint and its plugins. These are **devDependencies only** (they are not included in the production build). There is currently no safe fix: `npm audit fix --force` breaks peer dependencies and lint; upgrading to ESLint 10 requires plugin support that is not yet available. Until the ecosystem ships updated versions, these findings are accepted as low-risk for local/CI development.
