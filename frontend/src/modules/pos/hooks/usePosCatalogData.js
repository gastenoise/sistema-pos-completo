import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  buildPosItemsSearchParams,
  createPaymentMethodLookup,
  normalizePosCategories,
  normalizePosItems,
  normalizePosPaymentMethods,
} from '@/modules/pos/utils/posTransformers';

export const usePosCatalogData = ({
  businessId,
  searchQuery,
  barcodeOrSkuQuery,
  sourceFilter,
  categoryFilter,
  onlyPriceUpdated,
}) => {
  const { data: items = [], isLoading: loadingItems, isFetching: fetchingItems } = useQuery({
    queryKey: ['items', businessId, searchQuery, barcodeOrSkuQuery, sourceFilter, categoryFilter, onlyPriceUpdated],
    queryFn: async () => {
      if (!businessId) return [];
      const query = buildPosItemsSearchParams({
        sourceFilter,
        searchQuery,
        barcodeOrSkuQuery,
        categoryFilter,
        onlyPriceUpdated,
      });
      const response = await apiClient.get(`/protected/items?${query.toString()}`);
      return normalizePosItems(response);
    },
    enabled: !!businessId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/categories');
      return normalizePosCategories(response);
    },
    enabled: !!businessId,
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['paymentMethods', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/payment-methods');
      return normalizePosPaymentMethods(response);
    },
    enabled: !!businessId,
  });

  const paymentMethodLookup = useMemo(
    () => createPaymentMethodLookup(paymentMethods),
    [paymentMethods]
  );

  return {
    items,
    loadingItems,
    fetchingItems,
    categories,
    paymentMethods,
    paymentMethodLookup,
  };
};
