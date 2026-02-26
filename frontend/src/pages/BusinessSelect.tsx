import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { TOAST_MESSAGES } from '@/lib/toastMessages';
import { Store, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from 'sonner';

import { useBusiness } from '../components/pos/BusinessContext';
import { getBusinesses, selectBusiness as selectBusinessApi } from '@/modules/business/api';

export default function BusinessSelect() {
  const { selectBusiness, setBusinesses } = useBusiness();
  const [businesses, setLocalBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const list = await getBusinesses();
      setLocalBusinesses(list);
      setBusinesses(list);

      if (list.length === 1) {
        await handleSelectBusiness(list[0]);
        return;
      }

      // Si hay más de un negocio, forzar selección explícita.
      selectBusiness(null);

    } catch {
      toast.error(TOAST_MESSAGES.business.loadError);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBusiness = async (business) => {
    try {
      setSelectingId(business.id);
      await selectBusinessApi(business.id);
      selectBusiness({
        ...business,
        business_id: business.business_id ?? business.id
      });
      window.location.href = createPageUrl('POS');
    } catch {
      toast.error(TOAST_MESSAGES.business.selectError);
      setSelectingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {/* Use logo.svg instead of Store icon for system logo */}
            <img src="/logo.svg" alt="OpenVenta logo" className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl">Selección de negocio</CardTitle>
          <CardDescription>
            Elegí en cuál negocio vas a iniciar tu sesión
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {businesses.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-500">No businesses available</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {businesses.map((business) => {
                  // Usa una sola variable para el color base
                  const color = business.color || '#2563EB'; // #2563EB es azul (text-blue-600)

                  // Fondo: utiliza el color con menos opacidad si business.color existe; si no, el fallback azul claro
                  // Si business.color es hexa del tipo "#RRGGBB", agregamos 22 como opacidad baja (aprox. 13%)
                  let bgColor;
                  if (business.color && /^#([A-Fa-f0-9]{6})$/.test(business.color)) {
                    bgColor = business.color + '22'; // baja opacidad
                  } else {
                    bgColor = '#DBEAFE'; // bg-blue-100
                  }

                  return (
                    <button
                      key={business.id}
                      onClick={() => handleSelectBusiness(business)}
                      disabled={selectingId !== null}
                      className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: bgColor }}
                        >
                          <Store
                            className="w-5 h-5"
                            style={{ color: color }}
                          />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-slate-900">{business.name}</p>
                          {business.address && (
                            <p className="text-sm text-slate-500">{business.address}</p>
                          )}
                        </div>
                      </div>
                      {selectingId === business.id ? (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
