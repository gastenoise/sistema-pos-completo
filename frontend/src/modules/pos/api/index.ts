import { apiClient } from '@/api/client';
import { mapCatalogIsActive } from '@/lib/catalogNaming';
import { normalizeEntityResponse, normalizeListResponse } from '@/lib/normalizeResponse';

export const getPosItems = async (filters) => {
  const query = new URLSearchParams();
  if (filters?.sourceFilter && filters.sourceFilter !== 'all') {
    query.set('source', filters.sourceFilter);
  }
  query.set('per_page', '24');

  const trimmedSearch = filters?.searchQuery?.trim() || '';
  const trimmedBarcodeOrSku = filters?.barcodeOrSkuQuery?.trim() || '';

  if (trimmedSearch) query.set('search', trimmedSearch);
  if (trimmedBarcodeOrSku) query.set('barcode_or_sku', trimmedBarcodeOrSku);
  if (filters?.categoryFilter && filters.categoryFilter !== 'all') query.set('category', filters.categoryFilter);
  if (filters?.onlyPriceUpdated) query.set('only_price_updated', 'true');

  if (!trimmedSearch && !trimmedBarcodeOrSku && (filters?.sourceFilter || 'all') === 'all' && (filters?.categoryFilter || 'all') === 'all') {
    query.set('recent_first', 'true');
  }

  const response = await apiClient.get(`/protected/items?${query.toString()}`);
  return mapCatalogIsActive(normalizeListResponse(response, 'items')).map((item) => ({
    ...item,
    category_id: item.category_id !== null && item.category_id !== undefined ? Number(item.category_id) : null
  }));
};

export const getPosCategories = async () => {
  const response = await apiClient.get('/protected/categories');
  return mapCatalogIsActive(normalizeListResponse(response, 'categories')).map((category) => ({
    ...category,
    id: Number(category.id)
  }));
};

export const getPosPaymentMethods = async () => {
  const response = await apiClient.get('/protected/payment-methods');
  return normalizeListResponse(response, 'payment_methods')
    .map((method) => ({ ...method, type: method.type || method.code }))
    .filter((method) => (method.is_active ?? method.active) !== false);
};

export const getLatestClosedSale = async () => normalizeEntityResponse(await apiClient.get('/protected/sales/latest-closed'));

export const getBankAccount = async () => normalizeEntityResponse(await apiClient.get('/protected/banks'));

export const getPosCashRegisterStatus = async () => {
  const response = await apiClient.get('/protected/cash-register/status');
  const status = response?.status || (response?.data?.is_open ? 'open' : 'closed');
  const session = response?.session || response?.data?.session;
  if (status === 'open' && session) return { status, ...session };
  if (status) return { status };
  return { status: 'closed' };
};

export const startSale = async (payload) => normalizeEntityResponse(await apiClient.post('/protected/sales/start', payload));
export const closeSale = async (saleId, payload) => normalizeEntityResponse(await apiClient.post(`/protected/sales/${saleId}/close`, payload));
export const getSaleById = async (saleId) => normalizeEntityResponse(await apiClient.get(`/protected/sales/${saleId}`));
export const confirmSalePayment = async (saleId, paymentId, payload) => normalizeEntityResponse(await apiClient.post(
  `/protected/sales/${saleId}/payments/${paymentId}/confirm`,
  payload
));
export const createItem = async (payload) => normalizeEntityResponse(await apiClient.post('/protected/items', payload));

export const extractSaleId = (response) => (
  response?.id
  || response?.sale?.id
  || response?.data?.id
  || response?.data?.sale?.id
  || response?.sale_id
  || null
);
