import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/api/client';
import { getToken } from '@/api/auth';
import { createPageUrl } from '@/utils';
import { Store, Loader2 } from 'lucide-react';

import { useBusiness, BusinessProvider } from '../components/pos/BusinessContext';
import { normalizeListResponse } from '@/lib/normalizeResponse';

function HomeContent() {
  const { currentBusiness, selectBusiness, setBusinesses } = useBusiness();
  const [loading, setLoading] = useState(true);

  const initializeApp = useCallback(async () => {
    try {
      const isAuthenticated = !!getToken();
      if (!isAuthenticated) {
        window.location.href = `/login?redirect=${encodeURIComponent(createPageUrl('Home'))}`;
        return;
      }

      const response = await apiClient.get('/protected/businesses');
      const businesses = normalizeListResponse(response, 'businesses');

      setBusinesses(businesses);
      const currentBusinessId = currentBusiness?.business_id ?? currentBusiness?.id ?? null;
      const hasCurrentBusiness = currentBusinessId
        ? businesses.some((business) => business.id === currentBusinessId || business.business_id === currentBusinessId)
        : false;

      if (businesses.length === 0) {
        selectBusiness(null);
        window.location.href = createPageUrl('BusinessSelect');
      } else if (hasCurrentBusiness) {
        window.location.href = createPageUrl('POS');
      } else {
        selectBusiness(null);
        window.location.href = createPageUrl('BusinessSelect');
      }
    } catch (error) {
      console.error('Init error:', error);
      window.location.href = `/login?redirect=${encodeURIComponent(createPageUrl('Home'))}`;
    } finally {
      setLoading(false);
    }
  }, [currentBusiness, selectBusiness, setBusinesses]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <Store className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">QuickPOS</h1>
        <p className="text-blue-200 mb-8">Point of Sale System</p>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-white">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <BusinessProvider>
      <HomeContent />
    </BusinessProvider>
  );
}
