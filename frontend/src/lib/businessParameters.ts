export const BUSINESS_PARAMETER_IDS = {
  SHOW_CLOSED_SALE_AUTOMATICALLY: 'show_closed_sale_automatically',
  ENABLE_SEPA_ITEMS: 'enable_sepa_items',
  ENABLE_BARCODE_SCANNER: 'enable_barcode_scanner',
};

export const BUSINESS_BOOLEAN_PARAMETERS = [
  {
    id: BUSINESS_PARAMETER_IDS.SHOW_CLOSED_SALE_AUTOMATICALLY,
    label: 'Mostrar venta cerrada automáticamente',
    description: 'Si se activa, al cerrar una venta se abrirá automáticamente el detalle de la última venta.',
  },
  {
    id: BUSINESS_PARAMETER_IDS.ENABLE_SEPA_ITEMS,
    label: 'Habilitar ítems de separado (SEPA)',
    description: 'Activa la gestión de ítems marcados para separado (SEPA) en el negocio.',
  },
  {
    id: BUSINESS_PARAMETER_IDS.ENABLE_BARCODE_SCANNER,
    label: 'Habilitar escáner de código de barras',
    description: 'Permite usar el lector de código de barras para cargar productos en las ventas.',
  },
];

export const normalizeBusinessParameters = (business) => {
  if (!business || typeof business !== 'object') {
    return {
      [BUSINESS_PARAMETER_IDS.ENABLE_BARCODE_SCANNER]: true,
    };
  }

  const params = business.business_parameters;
  if (!params || typeof params !== 'object') {
    return {
      [BUSINESS_PARAMETER_IDS.ENABLE_BARCODE_SCANNER]: true,
    };
  }

  const normalized = Object.entries(params).reduce((acc, [key, value]) => {
    acc[key] = Boolean(value);
    return acc;
  }, {});

  if (!(BUSINESS_PARAMETER_IDS.ENABLE_BARCODE_SCANNER in normalized)) {
    normalized[BUSINESS_PARAMETER_IDS.ENABLE_BARCODE_SCANNER] = true;
  }

  return normalized;
};
