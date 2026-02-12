const SALE_STATUS_LABELS = {
  closed: 'Cerrada',
  open: 'Abierta',
  voided: 'Eliminada',
};

export function getSaleStatusLabel(status) {
  if (!status) return 'Desconocido';

  const normalizedStatus = String(status).trim().toLowerCase();
  return SALE_STATUS_LABELS[normalizedStatus] || `Desconocido (${status})`;
}

export { SALE_STATUS_LABELS };
