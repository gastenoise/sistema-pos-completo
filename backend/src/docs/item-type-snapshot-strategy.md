# Estrategia temporal para `sale_items.item_type_snapshot`

## Decisión

- **Mantener la columna por ahora** para evitar una migración destructiva inmediata.
- **Dejar de escribirla explícitamente desde la lógica de ventas** (`StartSaleAction` y `AddItemToSaleAction`).
- Mientras exista la columna, su valor queda como **valor por defecto de DB** (`product`) hasta confirmar que no hay consumidores reales.

## Justificación

1. Se eliminó el concepto de tipo para Quick Add en POS y del payload de venta.
2. No se detectaron lecturas activas de `item_type_snapshot` en reportes, tickets o exports del backend actual.
3. Mantener la columna temporalmente reduce riesgo de ruptura en integraciones externas no versionadas.

## Plan de retiro (siguiente paso)

1. Instrumentar un ciclo corto de observación en staging/producción para detectar consultas externas a `item_type_snapshot`.
2. Si no hay consumo real, crear migración para:
   - dropear índice/dependencias asociadas (si existieran),
   - eliminar `item_type_snapshot` de `sale_items`.
3. Ejecutar smoke tests de ventas, reportes y tickets tras la migración.

## Revisión de impacto realizada

- Reportes agregados por categoría usan `category_id_snapshot`, no `item_type_snapshot`.
- Ticket de venta usa `item_name_snapshot`, `unit_price_snapshot`, `quantity` y `total`.
- No se encontraron referencias de lectura a `item_type_snapshot` en código de aplicación.
