import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';

export const BUSINESS_PERMISSIONS_QUERY_KEY = 'business-permissions';

const EMPTY_PERMISSIONS = Object.freeze({});

export const useBusinessPermissions = (businessId) => {
  const normalizedBusinessId = businessId ?? null;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [BUSINESS_PERMISSIONS_QUERY_KEY, normalizedBusinessId],
    queryFn: async () => {
      const response = await apiClient.get('/protected/auth/permissions');
      const payload = response?.data ?? response;

      return {
        role: payload?.role ?? null,
        permissions: payload?.permissions ?? EMPTY_PERMISSIONS,
      };
    },
    enabled: !!normalizedBusinessId,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  const permissions = data?.permissions ?? EMPTY_PERMISSIONS;

  const can = useMemo(
    () => (permissionKey) => Boolean(permissions?.[permissionKey]),
    [permissions]
  );

  return {
    role: data?.role ?? null,
    permissions,
    can,
    isLoading: Boolean(normalizedBusinessId) && (isLoading || isFetching),
  };
};
