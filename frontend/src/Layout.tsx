import React, { useMemo } from 'react';
import TopNav from '@/components/pos/TopNav';
import AppStatusBar from '@/components/layout/AppStatusBar';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { getRouteMeta } from '@/routes/routeMeta';

type LayoutProps = {
  children: React.ReactNode;
  currentPageName?: string;
  contentClassName?: string;
};

export default function Layout({
  children,
  currentPageName,
  contentClassName,
}: LayoutProps) {
  const { user, logout } = useAuth();

  const meta = useMemo(() => {
    return getRouteMeta(currentPageName || '');
  }, [currentPageName]);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav user={user} onLogout={logout} currentPage={meta.label} />

      <main
        className={cn(
          'w-full px-4 py-4 lg:px-6 lg:py-6 pb-16',
          meta.contentWidth === 'full' && 'max-w-none',
          meta.contentWidth === 'wide' && 'mx-auto max-w-7xl',
          meta.contentWidth === 'default' && 'mx-auto max-w-4xl',
          contentClassName,
        )}
      >
        {children}
      </main>

      <AppStatusBar
        context={meta.statusBarContext}
        visible={meta.showStatusBar}
      />
    </div>
  );
}
