# Checklist de QA lingüística (nuevas pantallas)

- [ ] Todos los mensajes de `toast` usan constantes de `frontend/src/lib/toastMessages.js`.
- [ ] No hay textos en inglés en feedback al usuario (éxito, error, advertencia, vacío).
- [ ] Los mensajes dinámicos mantienen concordancia singular/plural en español.
- [ ] Se revisaron placeholders, labels, títulos, botones y ayudas contextuales.
- [ ] Los errores de red/API muestran fallback en español.
- [ ] Los términos de negocio son consistentes con el resto del sistema (ej. ítem, venta, caja).
- [ ] Se validó ortografía y acentuación (ej. ítem, configuración, sesión).
- [ ] Se probó al menos un flujo exitoso y uno de error por pantalla.
- [ ] Si se agrega un mensaje nuevo, primero se incorpora al catálogo central antes de usarlo.
