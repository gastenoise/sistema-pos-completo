# Nota de migración (POS)

- El flujo oficial de cobro del POS se mantiene en `frontend/src/components/pos/PaymentWizard.jsx`.
- Se eliminó la variante `PaymentWizardNew.jsx` y **no** deben reintroducirse variantes con sufijos `Old`/`New`.
- Se removieron artefactos legacy huérfanos (`frontend/src/components/Widget.js` y `frontend/src/components/Widget.jsx`).
- El hook `frontend/src/hooks/use mobile.jsx` fue renombrado a `frontend/src/hooks/useIsMobile.js` para mantener convención consistente.
- Si el flujo requiere cambios grandes, versionar por feature flag o por carpeta con contexto funcional (por ejemplo `wizard/v2/`), evitando duplicados ambiguos.
