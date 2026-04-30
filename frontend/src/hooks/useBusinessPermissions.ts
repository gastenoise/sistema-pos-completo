import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import {
  createPermissionChecker,
  EMPTY_PERMISSIONS,
  normalizeBusinessPermissionsPayload,
} from '@/hooks/businessPermissions.utils';

export const BUSINESS_PERMISSIONS_QUERY_KEY = 'business-permissions';

export const useBusinessPermissions = (businessId) => {
  const normalizedBusinessId = businessId ?? null;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [BUSINESS_PERMISSIONS_QUERY_KEY, normalizedBusinessId],
    queryFn: async () => {
      const response = await apiClient.get('/protected/auth/permissions');

      return normalizeBusinessPermissionsPayload(response);
    },
    enabled: !!normalizedBusinessId,
    staleTime: 1000 * 30,
  });

  const permissions = data?.permissions ?? EMPTY_PERMISSIONS;

  const can = useMemo(
    () => createPermissionChecker(permissions),
    [permissions]
  );

  return {
    role: data?.role ?? null,
    permissions,
    can,
    isLoading: Boolean(normalizedBusinessId) && (isLoading || isFetching),
  };
};
