export const formatPrice = (price, currentBusiness) => {
  const currency = currentBusiness?.currency || 'ARS';
  const amount = Number(price) || 0;

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency
  }).format(amount);
};
