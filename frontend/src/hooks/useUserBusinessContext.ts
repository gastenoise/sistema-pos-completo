import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { normalizeListResponse } from '@/lib/normalizeResponse';

const getBusinessId = (business) => business?.business_id ?? business?.id ?? null;

export const useUserBusinessContext = (businessId) => {
  const { data: businesses = [] } = useQuery({
    queryKey: ['user-business-context'],
    queryFn: async () => {
      const response = await apiClient.get('/protected/businesses');
      return normalizeListResponse(response, 'businesses');
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });

  const activeBusinessRole = useMemo(() => {
    if (!businessId) return null;
    const activeBusiness = businesses.find(
      (business) => String(getBusinessId(business)) === String(businessId)
    );

    return activeBusiness?.pivot?.role || activeBusiness?.role || null;
  }, [businesses, businessId]);

  return {
    businesses,
    activeBusinessRole,
  };
};

