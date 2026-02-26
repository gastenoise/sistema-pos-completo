import { useQuery } from '@tanstack/react-query';
import { getBankAccount, getCategories, getPaymentMethods, getSmtpConfig } from '@/modules/settings/api';
import {
  normalizeSettingsCategories,
  normalizeSettingsPaymentMethods,
} from '@/modules/settings/utils/settingsTransformers';

export const useSettingsCatalogIntegrations = (businessId) => {
  const { data: categories = [], isLoading: loadingCategories, isFetching: fetchingCategories } = useQuery({
    queryKey: ['categories', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await getCategories();
      return normalizeSettingsCategories(response);
    },
    enabled: !!businessId,
  });

  const { data: paymentMethods = [], isLoading: loadingPayments, isFetching: fetchingPayments } = useQuery({
    queryKey: ['paymentMethods', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await getPaymentMethods();
      return normalizeSettingsPaymentMethods(response);
    },
    enabled: !!businessId,
  });

  const { data: bankAccount } = useQuery({
    queryKey: ['bankAccount', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const response = await getBankAccount();
      return response?.data ?? response;
    },
    enabled: !!businessId,
  });

  const { data: smtpConfig } = useQuery({
    queryKey: ['smtpConfig', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const response = await getSmtpConfig();
      return response?.data || response;
    },
    enabled: !!businessId,
  });

  return {
    categories,
    loadingCategories,
    fetchingCategories,
    paymentMethods,
    loadingPayments,
    fetchingPayments,
    bankAccount,
    smtpConfig,
  };
};
