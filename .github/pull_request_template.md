## Summary
-

## Testing
-

## Checklist
- [ ] Confirmé que el backend mantiene el timezone default de Laravel sin cambios.
- [ ] Confirmé que la UI renderiza fechas/horas usando timezone local del navegador vía `src/lib/dateTime.js`.
- [ ] No hay hardcodes de `America/Argentina/Buenos_Aires` ni uso directo de `toLocaleDateString`, `toLocaleString` o `Intl.DateTimeFormat` fuera de `lib/dateTime`.
