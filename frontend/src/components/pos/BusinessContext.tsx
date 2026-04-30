import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { setBusinessContext } from '@/api/client';
import { getSmtpStatus } from '@/api/business';
import { BUSINESS_PERMISSIONS_QUERY_KEY } from '@/hooks/useBusinessPermissions';

const BusinessContext = createContext(null);

const isNode = typeof window === 'undefined';
const storage = isNode ? null : window.localStorage;
const STORAGE_CURRENT = 'pos_current_business';
const STORAGE_BUSINESSES = 'pos_businesses';

const readStorage = (key) => {
  if (!storage) return null;
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeStorage = (key, value) => {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
};

export const BusinessProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [businesses, setBusinessesState] = useState(() => readStorage(STORAGE_BUSINESSES) || []);
  const [currentBusiness, setCurrentBusiness] = useState(() => readStorage(STORAGE_CURRENT));

  useEffect(() => {
    setBusinessContext(currentBusiness);
  }, [currentBusiness]);

  const selectBusiness = (business) => {
    const normalizedBusiness = business
      ? { ...business, business_id: business.business_id ?? business.id }
      : business;
    setCurrentBusiness(normalizedBusiness);
    writeStorage(STORAGE_CURRENT, normalizedBusiness);
    queryClient.invalidateQueries({ queryKey: [BUSINESS_PERMISSIONS_QUERY_KEY] });
  };

  const setBusinesses = (nextBusinesses) => {
    setBusinessesState(nextBusinesses);
    writeStorage(STORAGE_BUSINESSES, nextBusinesses);
  };

  const refreshCurrentBusiness = (nextBusiness) => {
    if (!nextBusiness) return;

    setCurrentBusiness((previous) => {
      const merged = {
        ...(previous || {}),
        ...nextBusiness,
        business_id: nextBusiness.business_id ?? previous?.business_id ?? nextBusiness.id ?? previous?.id,
      };
      writeStorage(STORAGE_CURRENT, merged);
      return merged;
    });
  };

  const businessId = currentBusiness?.business_id ?? currentBusiness?.id ?? null;

  const { data: smtpStatus, isFetching: isCheckingSmtpStatus } = useQuery({
    queryKey: ['smtpStatus', businessId],
    queryFn: getSmtpStatus,
    enabled: !!businessId,
    staleTime: 1000 * 60 * 5,
    refetchOnReconnect: false,
    retry: 1,
  });

  const value = useMemo(() => ({
    businesses,
    currentBusiness,
    businessId,
    selectBusiness,
    setBusinesses,
    refreshCurrentBusiness,
    smtpStatus,
    isCheckingSmtpStatus,
  }), [businesses, currentBusiness, businessId, smtpStatus, isCheckingSmtpStatus]);

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
