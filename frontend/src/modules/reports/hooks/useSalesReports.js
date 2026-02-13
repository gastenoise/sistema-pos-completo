import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/api/items';
import { getPaymentMethods } from '@/api/sales';
import { getSalesReport, getSalesSummary } from '@/api/reports';

export const useSalesQuery = ({ businessId, dateFrom, dateTo, status, paymentMethod, categoryId }) => useQuery({
  queryKey: ['sales', businessId, dateFrom, dateTo, status, paymentMethod, categoryId],
  queryFn: () => getSalesReport({ dateFrom, dateTo, status, paymentMethod, categoryId }),
  enabled: Boolean(businessId)
});

export const useSalesSummaryQuery = ({ businessId, dateFrom, dateTo, paymentMethod, categoryId }) => useQuery({
  queryKey: ['sales-summary', businessId, dateFrom, dateTo, paymentMethod, categoryId],
  queryFn: () => getSalesSummary({ dateFrom, dateTo, paymentMethod, categoryId }),
  enabled: Boolean(businessId)
});

export const useReportPaymentMethodsQuery = (businessId) => useQuery({
  queryKey: ['paymentMethods', businessId],
  queryFn: getPaymentMethods,
  enabled: Boolean(businessId)
});

export const useReportCategoriesQuery = (businessId) => useQuery({
  queryKey: ['report-categories', businessId],
  queryFn: getCategories,
  enabled: Boolean(businessId)
});

export function useSalesReports() {
  return { pageSizeTarget: 300 };
}
