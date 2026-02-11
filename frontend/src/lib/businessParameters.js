export const BUSINESS_PARAMETER_IDS = {
  SHOW_CLOSED_SALE_AUTOMATICALLY: 'show_closed_sale_automatically',
};

export const BUSINESS_BOOLEAN_PARAMETERS = [
  {
    id: BUSINESS_PARAMETER_IDS.SHOW_CLOSED_SALE_AUTOMATICALLY,
    label: 'Mostrar venta cerrada automáticamente',
    description: 'Si se activa, al cerrar una venta se abrirá automáticamente el detalle de la última venta.',
  },
];

export const normalizeBusinessParameters = (business) => {
  if (!business || typeof business !== 'object') {
    return {};
  }

  const params = business.business_parameters;
  if (!params || typeof params !== 'object') {
    return {};
  }

  return Object.entries(params).reduce((acc, [key, value]) => {
    acc[key] = Boolean(value);
    return acc;
  }, {});
};
