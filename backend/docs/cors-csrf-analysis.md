# Análisis CORS + CSRF (frontend ↔ backend)

## Síntomas observados

- `GET http://localhost:5173/api/sanctum/csrf-cookie` devolviendo `404`.
- Errores de CORS/credenciales en requests autenticados (`/protected/auth/me`).
- Fallo de validación CSRF al loguear o consumir endpoints protegidos.

## Causa raíz

1. **Faltaba proxy local en Vite** para `/api/*` (y `/sanctum/*`).
   - El frontend pedía `http://localhost:5173/api/...`, pero Vite devolvía 404 porque no reenviaba al backend.
2. **Variables locales de sesión no alineadas para HTTP local**.
   - `SESSION_SECURE_COOKIE=true` impide cookies en `http://localhost`.
   - `SESSION_SAMESITE=none` requiere `Secure`, incompatible con HTTP local.
3. **`SANCTUM_STATEFUL_DOMAINS` incompleto** para el puerto real del frontend local (`5173`).

## Correcciones aplicadas en el código

- Se agregó proxy de desarrollo en `frontend/vite.config.js`:
  - `/api/*` → backend local y se elimina prefijo `/api` antes de llegar a Laravel.
  - `/sanctum/*` → backend local.
- Se actualizaron ejemplos de entorno:
  - `backend/.env.example`: incluye `localhost:5173` y `127.0.0.1:5173` en `SANCTUM_STATEFUL_DOMAINS`.
  - `backend/.env.example`: para local HTTP, `SESSION_SECURE_COOKIE=false` y `SESSION_SAMESITE=lax`.
  - `frontend/.env.example`: `VITE_API_URL=/api` + `VITE_BACKEND_URL=http://localhost:8080`.

## Recomendación para validar en local

1. Backend (`backend/.env`):
   - `APP_URL=http://localhost:8080`
   - `SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173,localhost,localhost:8080,127.0.0.1,127.0.0.1:8080`
   - `SESSION_DOMAIN=localhost`
   - `SESSION_SECURE_COOKIE=false`
   - `SESSION_SAMESITE=lax`
2. Frontend (`frontend/.env.local`):
   - `VITE_API_URL=/api`
   - `VITE_BACKEND_URL=http://localhost:8080`
3. Limpiar caché config Laravel:
   - `php artisan optimize:clear`
4. Reiniciar ambos servidores (backend y frontend).

## Nota para producción

En HTTPS (Vercel/Render) se recomienda:
- `SESSION_SECURE_COOKIE=true`
- `SESSION_SAMESITE=none`
- `CORS_ALLOWED_ORIGINS` con dominios HTTPS reales
- `SANCTUM_STATEFUL_DOMAINS` con hostnames de frontend reales
