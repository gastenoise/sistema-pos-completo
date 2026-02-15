# Impacto de índices para reportes y filtros operativos

## Índices propuestos y naming

Se validaron y aplicaron los siguientes índices con nombres explícitos y consistentes:

- `sales_biz_status_created_idx` → `sales (business_id, status, created_at)`
- `sales_biz_created_idx` → `sales (business_id, created_at)`
- `sale_payments_sale_status_idx` → `sale_payments (sale_id, status)`
- `sale_items_sale_item_idx` → `sale_items (sale_id, item_id)`

## Metodología de medición

Se ejecutó un benchmark local con `sqlite3` en memoria para comparar `EXPLAIN QUERY PLAN` y tiempo promedio por consulta (20 iteraciones) en dos escenarios:

1. Sin índices nuevos.
2. Con índices nuevos.

Consultas evaluadas (alineadas con `ReportController`):

- Q1: filtro de ventas por `business_id + status + rango de fecha`.
- Q2: filtro operativo por `business_id + rango de fecha`.
- Q3: agregación de pagos por venta cerrada y estado de pago.
- Q4: `EXISTS` de ítems por venta con filtro por `sale_id + item_id`.

## Resultados `EXPLAIN` y latencia

### Q1 — Ventas por negocio/estado/fecha

- Sin índice: `SCAN sales`
- Con índice: `SEARCH sales USING COVERING INDEX sales_biz_status_created_idx`
- Tiempo promedio: **0.686 ms → 0.062 ms** (**-90.96%**)

### Q2 — Ventas por negocio/fecha

- Sin índice: `SCAN sales`
- Con índice: `SEARCH sales USING COVERING INDEX sales_biz_created_idx`
- Tiempo promedio: **0.666 ms → 0.069 ms** (**-89.59%**)

### Q3 — Totales de pagos con join a ventas

- Sin índice: `SCAN sale_payments` + `SEARCH sales USING INTEGER PRIMARY KEY`
- Con índice: `SEARCH sales USING COVERING INDEX sales_biz_status_created_idx` + `SEARCH sale_payments USING INDEX sale_payments_sale_status_idx`
- Tiempo promedio: **2.043 ms → 0.251 ms** (**-87.73%**)

### Q4 — EXISTS de `sale_items` por `sale_id` + `item_id`

- Sin índice: `SCAN sales` + `SCAN sale_items` en subconsulta correlacionada
- Con índice: `SEARCH sales USING COVERING INDEX sales_biz_created_idx` + `SEARCH sale_items USING COVERING INDEX sale_items_sale_item_idx`
- Tiempo promedio: **577.889 ms → 0.246 ms** (**-99.96%**)

## Costo de escritura vs ganancia de lectura

En el mismo benchmark (carga masiva de escrituras):

- Inserción sin índices: **0.0628 s**
- Inserción con índices: **0.1165 s**
- Sobrecosto de escritura: **+85.72%**

Conclusión práctica:

- Hay una **ganancia de lectura muy alta** para consultas de reportes/filtros críticos.
- Existe un **costo adicional de escritura** por mantenimiento de índices.
- Dado que el módulo evaluado es intensivo en lectura para reportes operativos, el balance favorece aplicar los índices.
- Mantener monitoreo en producción (p95/p99 en endpoints de reportes y tiempo de cierre de venta) para ajustar si cambia el patrón de carga.
