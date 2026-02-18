import { request } from './client';
import { normalizeEntityResponse, normalizeListResponse } from '@/lib/normalizeResponse';
import { mapCatalogIsActive } from '@/lib/catalogNaming';

export const getPosItems = async ({ search = '', barcode = '', limit = 20 } = {}) => {
  const query = new URLSearchParams();
  query.set('active', 'true');
  query.set('source', 'all');
  query.set('per_page', String(limit));
  if (search) {
    query.set('search', search);
  }
  if (barcode) {
    query.set('barcode', barcode);
  }

  const response = await request(`/protected/items?${query.toString()}`);
  return mapCatalogIsActive(normalizeListResponse(response, 'items'));
};

export const getPaymentMethods = async () => {
  const response = await request('/protected/payment-methods');
  return normalizeListResponse(response, 'payment_methods').map((method) => ({
    ...method,
    type: method.type || method.code
  }));
};

export const getLatestClosedSale = async () => {
  const response = await request('/protected/sales/latest-closed');
  return normalizeEntityResponse(response);
};

export const getSaleById = async (saleId) => {
  const response = await request(`/protected/sales/${saleId}`);
  return normalizeEntityResponse(response);
};

export const startSale = async (payload) => normalizeEntityResponse(await request('/protected/sales/start', {
  method: 'POST',
  body: payload
}));

export const closeSale = async (saleId, payload) => request(`/protected/sales/${saleId}/close`, {
  method: 'POST',
  body: payload
});

export const confirmSalePayment = async (saleId, paymentId, payload) => normalizeEntityResponse(await request(
  `/protected/sales/${saleId}/payments/${paymentId}/confirm`,
  { method: 'POST', body: payload }
));
