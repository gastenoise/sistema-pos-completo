import { request } from './client';
import { normalizeListResponse } from '@/lib/normalizeResponse';

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
