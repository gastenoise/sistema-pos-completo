import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { setBusinessContext } from '@/api/client';
import { getIconCatalog, getSmtpStatus } from '@/api/business';

const BusinessContext = createContext(null);

const isNode = typeof window === 'undefined';
const storage = isNode ? null : window.localStorage;
const STORAGE_CURRENT = 'pos_current_business';
const STORAGE_BUSINESSES = 'pos_businesses';
const STORAGE_ICON_CATALOG = 'pos_icon_catalog';

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
  const [businesses, setBusinessesState] = useState(() => readStorage(STORAGE_BUSINESSES) || []);
  const [currentBusiness, setCurrentBusiness] = useState(() => readStorage(STORAGE_CURRENT));
  const [iconCatalog, setIconCatalog] = useState(() => readStorage(STORAGE_ICON_CATALOG) || {});

  useEffect(() => {
    setBusinessContext(currentBusiness);
  }, [currentBusiness]);

  const selectBusiness = (business) => {
    const normalizedBusiness = business
      ? { ...business, business_id: business.business_id ?? business.id }
      : business;
    setCurrentBusiness(normalizedBusiness);
    writeStorage(STORAGE_CURRENT, normalizedBusiness);
  };

  const setBusinesses = (nextBusinesses) => {
    setBusinessesState(nextBusinesses);
    writeStorage(STORAGE_BUSINESSES, nextBusinesses);
  };

  const businessId = currentBusiness?.business_id ?? currentBusiness?.id ?? null;

  const { data: smtpStatus, isFetching: isCheckingSmtpStatus } = useQuery({
    queryKey: ['smtpStatus', businessId],
    queryFn: getSmtpStatus,
    enabled: !!businessId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const { data: iconCatalogResponse } = useQuery({
    queryKey: ['iconCatalog', businessId],
    queryFn: getIconCatalog,
    enabled: !!businessId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  useEffect(() => {
    if (!iconCatalogResponse || typeof iconCatalogResponse !== 'object') return;
    setIconCatalog(iconCatalogResponse);
    writeStorage(STORAGE_ICON_CATALOG, iconCatalogResponse);
  }, [iconCatalogResponse]);

  const value = useMemo(() => ({
    businesses,
    currentBusiness,
    businessId,
    selectBusiness,
    setBusinesses,
    smtpStatus,
    isCheckingSmtpStatus,
    iconCatalog,
  }), [businesses, currentBusiness, businessId, smtpStatus, isCheckingSmtpStatus, iconCatalog]);

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
