# Application Actions (Use Cases)

Esta capa concentra la lógica de negocio por caso de uso (acciones inyectables).

## Regla de mantenimiento

- Los controladores deben ser orquestadores finos: validar request, invocar una acción y devolver resource/response.
- Nuevos endpoints **no deben** introducir lógica compleja dentro del controller.
- Si aparece una regla de negocio nueva, debe implementarse en `app/Actions` (o `app/Domain/<Context>/Actions`).
