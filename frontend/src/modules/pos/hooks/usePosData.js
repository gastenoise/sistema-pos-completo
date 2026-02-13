import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/api/items';
import { getCashRegisterStatus } from '@/api/cash-register';
import { getLatestClosedSale, getPaymentMethods, getPosItems } from '@/api/sales';
import { request } from '@/api/client';

export const usePosItemsQuery = (businessId) => useQuery({
  queryKey: ['pos-items', businessId],
  queryFn: getPosItems,
  enabled: Boolean(businessId)
});

export const usePosCategoriesQuery = (businessId) => useQuery({
  queryKey: ['pos-categories', businessId],
  queryFn: getCategories,
  enabled: Boolean(businessId)
});

export const usePosPaymentMethodsQuery = (businessId) => useQuery({
  queryKey: ['paymentMethods', businessId],
  queryFn: getPaymentMethods,
  enabled: Boolean(businessId)
});

export const useLatestClosedSaleQuery = (businessId) => useQuery({
  queryKey: ['latest-closed-sale', businessId],
  queryFn: getLatestClosedSale,
  enabled: Boolean(businessId)
});

export const useBanksQuery = (businessId) => useQuery({
  queryKey: ['banks', businessId],
  queryFn: async () => {
    const response = await request('/protected/banks');
    return response?.data ?? response;
  },
  enabled: Boolean(businessId)
});

export const usePosCashStatusQuery = (businessId) => useQuery({
  queryKey: ['cash-register-status', businessId],
  queryFn: getCashRegisterStatus,
  enabled: Boolean(businessId)
});

export function usePosData() {
  return { pageSizeTarget: 300 };
}
