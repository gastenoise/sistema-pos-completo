import React, { useMemo } from 'react';
import TopNav from '@/components/pos/TopNav';
import AppStatusBar from '@/components/layout/AppStatusBar';
import { useAuth } from '@/lib/AuthContext';
import { useBusiness } from '@/components/pos/BusinessContext';
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

      <AppStatusBar />
    </div>
  );
}
