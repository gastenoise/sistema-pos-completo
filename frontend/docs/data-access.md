# Data access pattern (frontend)

## Convención única

Este proyecto adopta **opción B**:

- `apiClient` es la única interfaz pública para llamadas HTTP.
- `request` queda como implementación interna de `src/api/client.js` y **no debe importarse** fuera de ese archivo.

## Dónde normalizar

La normalización de respuestas NO debe hacerse en componentes de pantalla (`pages/`, `components/`, `modules/*/components`).

Debe hacerse únicamente en:

- `frontend/src/modules/*/api`
- `frontend/src/api/*.normalize.js`
- (de forma auxiliar) `frontend/src/api/*` cuando encapsula endpoints cross-module.

## Contratos de retorno

Las funciones API deben retornar siempre una forma canónica:

- entidad (`object`) para endpoints de detalle/acción,
- lista (`array`) para colecciones,
- o metadatos explícitos cuando aplique (`{ data, status, headers }` en descargas con `includeMeta`).

Evitar en capas superiores patrones como:

- `response?.data ?? response`
- `response?.data || response`

## Manejo de errores

Para evitar `catch` repetitivos con mensajes genéricos, usar utilidades compartidas:

- `mapApiErrorMessage(error, fallback)`
- `mapApiError(error, fallback)`

ubicadas en `frontend/src/api/errorMapping.js`.

Uso recomendado en UI:

```js
catch (error) {
  toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.items.deleteError));
}
```

## Checklist rápido

1. ¿La pantalla llama solo funciones del módulo API? ✅
2. ¿La normalización vive en `modules/*/api` o `api/*.normalize.js`? ✅
3. ¿El retorno del API module evita `response?.data ?? response` en UI? ✅
4. ¿Se reutiliza `mapApiErrorMessage` para toasts de error? ✅
