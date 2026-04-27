import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useBusiness } from '@/components/pos/BusinessContext';
import { useBusinessPermissions } from '@/hooks/useBusinessPermissions';
import { useCashStatusQuery } from '@/modules/cash-register/hooks/useCashRegisterData';
import { cn } from '@/lib/utils';
import { Clock, User, Shield, Wallet } from 'lucide-react';

export default function AppStatusBar() {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.business_id ?? currentBusiness?.id;
  const { role, can } = useBusinessPermissions(businessId);

  // Only fetch cash status if user has permission to view it
  const canViewCash = can('view_cash_register');
  const { data: cashStatus } = useCashStatusQuery(businessId, !!businessId && canViewCash);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const userDisplayName = user?.name || user?.email?.split('@')[0] || 'Usuario';
  const roleDisplayName = role ? role.charAt(0).toUpperCase() + role.slice(1) : '...';

  const isCashOpen = cashStatus?.is_open || false;

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 h-8 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 text-[10px] sm:text-xs text-slate-500">
        {/* Left: Operational Info */}
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[80px] sm:max-w-[120px]">{userDisplayName}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Shield className="h-3 w-3" />
            <span>{roleDisplayName}</span>
          </div>

          {canViewCash && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Wallet className="h-3 w-3" />
              <span className={cn(
                "font-medium",
                isCashOpen ? "text-emerald-600" : "text-amber-600"
              )}>
                Caja {isCashOpen ? 'Abierta' : 'Cerrada'}
              </span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <Clock className="h-3 w-3" />
            <span>{formatTime(now)}</span>
          </div>
        </div>

        {/* Right: Credits */}
        <div className="flex items-center gap-1 shrink-0 ml-4">
          <span>Desarrollado por</span>
          <a
            href="https://gastonurgorri.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
          >
            Gastón Urgorri
          </a>
        </div>
      </div>
    </footer>
  );
}
