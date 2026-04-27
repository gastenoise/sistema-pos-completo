import React, { useEffect, useMemo, useState } from 'react';
import TopNav from '@/components/pos/TopNav';
import { useAuth } from '@/lib/AuthContext';
import { useBusiness } from '@/components/pos/BusinessContext';
import { useCart } from '@/components/pos/CartContext';
import { cn } from '@/lib/utils';

type LayoutProps = {
  children: React.ReactNode;
  currentPageName?: string;
  contentClassName?: string;
  fullWidth?: boolean;
};

const PAGE_LABEL_BY_ROUTE_KEY: Record<string, string> = {
  CashRegister: 'Caja',
  Items: 'Items',
  POS: 'POS',
  Reports: 'Reportes',
  Settings: 'Ajustes',
};

export default function Layout({
  children,
  currentPageName,
  contentClassName,
  fullWidth = false,
}: LayoutProps) {
  const { user, logout } = useAuth();
  const { currentBusiness } = useBusiness();
  const { offlineQueue } = useCart();
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const resolvedPageName = useMemo(() => {
    if (!currentPageName) return undefined;
    return PAGE_LABEL_BY_ROUTE_KEY[currentPageName] || currentPageName;
  }, [currentPageName]);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav user={user} onLogout={logout} currentPage={resolvedPageName} />

      <main
        className={cn(
          'w-full px-4 py-4 lg:px-6 lg:py-6 pb-16',
          fullWidth ? 'max-w-none' : 'mx-auto max-w-7xl',
          contentClassName,
        )}
      >
        {children}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-xs text-slate-600">
          <span className="truncate">{currentBusiness?.name || 'Negocio'}</span>
          <span className="flex items-center gap-3">
            <span>{resolvedPageName || 'App'}</span>
            <span>{isOnline ? 'Online' : 'Offline'}</span>
            <span>Cola: {offlineQueue?.length || 0}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
