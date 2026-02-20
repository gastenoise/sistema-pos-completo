# `/protected/items` - filtros soportados

Este endpoint acepta filtros combinados por query string para ambos flujos (`ItemsPage` y `POS`).

## Parámetros estándar

- `search`: busca por nombre o marca.
- `barcode_or_sku`: busca por código de barras o SKU.
- `category`: categoría (`all` se omite, también soporta `uncategorized`).
- `source`: `all`, `local` o `sepa`.
- `only_price_updated`: `true` para traer solo ítems con precio actualizado.
- `page` y `per_page`: paginación.

## Ejemplos

### 1) búsqueda por nombre/marca y fuente

```http
GET /protected/items?search=coca&source=local&page=1&per_page=20
```

### 2) búsqueda por barcode o SKU y categoría

```http
GET /protected/items?barcode_or_sku=7791234567890&category=12&source=all
```

### 3) filtros combinados con precio actualizado

```http
GET /protected/items?search=detergente&barcode_or_sku=SKU-DET-1&category=uncategorized&source=sepa&only_price_updated=true
```

### 4) listado reciente cuando no hay filtros

```http
GET /protected/items?source=all&per_page=24&recent_first=true
```
