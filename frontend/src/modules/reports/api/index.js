import { request } from '@/api/client';
import { normalizeListResponse } from '@/lib/normalizeResponse';
import { mapCatalogIsActive } from '@/lib/catalogNaming';

export const getSalesReport = async ({ dateFrom, dateTo, status, paymentMethod, categoryId }) => {
  const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo, statuses: status });
  if (paymentMethod) params.set('payment_method', paymentMethod);
  if (categoryId) params.set('category_id', categoryId);

  const response = await request(`/protected/reports/sales?${params.toString()}`);
  return normalizeListResponse(response, 'sales');
};

export const getSalesSummary = async ({ dateFrom, dateTo, paymentMethod, categoryId }) => {
  const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo });
  if (paymentMethod) params.set('payment_method', paymentMethod);
  if (categoryId) params.set('category_id', categoryId);

  const response = await request(`/protected/reports/summary?${params.toString()}`);
  return response?.data ?? response ?? {};
};

export const exportSalesReport = async ({ dateFrom, dateTo, status }) => {
  const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo, type: 'sales' });
  if (status) params.set('statuses', status);
  return request(`/protected/reports/export?${params.toString()}`, {
    responseType: 'blob',
    includeMeta: true
  });
};

export const getReportPaymentMethods = async () => {
  const response = await request('/protected/payment-methods');
  return normalizeListResponse(response, 'payment_methods').map((method) => ({
    ...method,
    type: method.type || method.code
  }));
};

export const getReportCategories = async () => {
  const response = await request('/protected/categories');
  return mapCatalogIsActive(normalizeListResponse(response, 'categories')).map((category) => ({
    ...category,
    id: Number(category.id)
  }));
};
