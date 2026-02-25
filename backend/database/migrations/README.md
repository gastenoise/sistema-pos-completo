# Convención de migraciones

## Objetivo

Las migraciones se organizan por **bounded context** para evitar archivos monolíticos y facilitar revisiones, rollbacks y troubleshooting.

## Bounded contexts actuales

1. `auth/usuarios`
2. `negocios/roles/permisos`
3. `catalogo/items/sepa`
4. `ventas/pagos/caja`
5. `integraciones (smtp/api keys/navigation)`

## Naming

- Formato: `YYYY_MM_DD_HHMMSS_<accion>_<contexto>_tables.php`.
- Para baseline inicial se usa prefijo `0000_00_00_` con sufijos ordenados (`000000`, `000010`, `000020`, etc.) para preservar orden estable.
- El `<contexto>` debe mapear a uno de los bounded contexts definidos.

## Granularidad esperada

- Una migración puede crear múltiples tablas **solo si pertenecen al mismo bounded context**.
- Cambios estructurales nuevos (columnas, índices, constraints) deben ir en una migración incremental dedicada.
- No introducir nuevas migraciones "mega" que mezclen contextos distintos.

## Reglas para contribuciones futuras

- Si un cambio cruza contextos, dividirlo en varias migraciones coordinadas por timestamp.
- Mantener equivalencia de constraints e índices respecto al esquema en producción.
- Verificar `php artisan migrate:fresh --seed` para garantizar compatibilidad con seeds existentes.
