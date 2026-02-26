import { apiClient } from './client';
import { normalizeEntityResponse, normalizeListResponse } from '@/lib/normalizeResponse';
import { mapCatalogIsActive } from '@/lib/catalogNaming';

export const getPosItems = async ({ search = '', barcode = '', limit = 20 } = {}) => {
  const query = new URLSearchParams();
  query.set('source', 'all');
  query.set('per_page', String(limit));
  if (search) query.set('search', search);
  if (barcode) query.set('barcode', barcode);

  return mapCatalogIsActive(normalizeListResponse(await apiClient.get(`/protected/items?${query.toString()}`), 'items'));
};

export const getPaymentMethods = async () => normalizeListResponse(await apiClient.get('/protected/payment-methods'), 'payment_methods').map((method) => ({
  ...method,
  type: method.type || method.code
}));

export const getLatestClosedSale = async () => normalizeEntityResponse(await apiClient.get('/protected/sales/latest-closed'));

export const getSaleById = async (saleId) => normalizeEntityResponse(await apiClient.get(`/protected/sales/${saleId}`));

export const startSale = async (payload) => normalizeEntityResponse(await apiClient.post('/protected/sales/start', payload));

export const closeSale = (saleId, payload) => apiClient.post(`/protected/sales/${saleId}/close`, payload);

export const confirmSalePayment = async (saleId, paymentId, payload) => normalizeEntityResponse(
  await apiClient.post(`/protected/sales/${saleId}/payments/${paymentId}/confirm`, payload)
);
