import { apiClient } from './client';
import { normalizeEntityResponse, normalizeListResponse } from '@/lib/normalizeResponse';

export const getSalesReport = async ({ dateFrom, dateTo, status, paymentMethod, categoryId }) => {
  const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo, statuses: status });
  if (paymentMethod) params.set('payment_method', paymentMethod);
  if (categoryId) params.set('category_id', categoryId);

  return normalizeListResponse(await apiClient.get(`/protected/reports/sales?${params.toString()}`), 'sales');
};

export const getSalesSummary = async ({ dateFrom, dateTo, paymentMethod, categoryId }) => {
  const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo });
  if (paymentMethod) params.set('payment_method', paymentMethod);
  if (categoryId) params.set('category_id', categoryId);

  return normalizeEntityResponse(await apiClient.get(`/protected/reports/summary?${params.toString()}`)) ?? {};
};

export const exportSalesReport = ({ dateFrom, dateTo, status }) => {
  const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo, type: 'sales' });
  if (status) params.set('statuses', status);
  return apiClient.get(`/protected/reports/export?${params.toString()}`, {
    responseType: 'blob',
    includeMeta: true
  });
};
