import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/api/client';
import { createPageUrl } from '@/utils';
import { Store, Loader2 } from 'lucide-react';

import { useBusiness } from '../components/pos/BusinessContext';
import { normalizeListResponse } from '@/lib/normalizeResponse';

export default function Home() {
  const { selectBusiness, setBusinesses } = useBusiness();
  const [loading, setLoading] = useState(true);

  const initializeApp = useCallback(async () => {
    try {
      const response = await apiClient.get('/protected/businesses');
      const businesses = normalizeListResponse(response, 'businesses');
      setBusinesses(businesses);

      if (businesses.length === 0) {
        selectBusiness(null);
        window.location.href = createPageUrl('BusinessSelect');
        return;
      }

      if (businesses.length === 1) {
        const business = businesses[0];
        await apiClient.post('/protected/businesses/select', { business_id: business.id });
        selectBusiness({ ...business, business_id: business.business_id ?? business.id });
        window.location.href = createPageUrl('POS');
        return;
      }

      // Más de un negocio: siempre exigir selección explícita en cada inicio de sesión.
      selectBusiness(null);
      window.location.href = createPageUrl('BusinessSelect');
    } catch (error) {
      console.error('Init error:', error);
      window.location.href = `/login?redirect=${encodeURIComponent(createPageUrl('Home'))}`;
    } finally {
      setLoading(false);
    }
  }, [selectBusiness, setBusinesses]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <Store className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">OpenVenta</h1>
        <p className="text-blue-200 mb-8">Sistema de Punto de Venta</p>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-white">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Cargando...</span>
          </div>
        )}
      </div>
    </div>
  );
}
