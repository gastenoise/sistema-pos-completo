import React, { createContext, useContext, useMemo } from 'react';

import { useBusiness } from '@/components/pos/BusinessContext';
import { useBusinessPermissions } from '@/hooks/useBusinessPermissions';

const AuthorizationContext = createContext(null);

export const AuthorizationProvider = ({ children }) => {
  const { businessId } = useBusiness();
  const authorization = useBusinessPermissions(businessId);

  const value = useMemo(
    () => ({ ...authorization, businessId }),
    [authorization, businessId]
  );

  return (
    <AuthorizationContext.Provider value={value}>
      {children}
    </AuthorizationContext.Provider>
  );
};

export const useAuthorization = () => {
  const context = useContext(AuthorizationContext);

  if (!context) {
    throw new Error('useAuthorization must be used within an AuthorizationProvider');
  }

  return context;
};
