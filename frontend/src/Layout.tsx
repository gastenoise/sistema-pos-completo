import React from 'react';
import TopNav from '@/components/pos/TopNav';
import AppStatusBar from '@/components/layout/AppStatusBar';
import { cn } from '@/lib/utils';
import { useShellState } from '@/hooks/useShellState';

type LayoutProps = {
  children: React.ReactNode;
  currentPageName?: string;
  contentClassName?: string;
};

export default function Layout({
  children,
  currentPageName = '',
  contentClassName,
}: LayoutProps) {
  const { topNavProps, statusBarProps, layoutFlags } = useShellState(currentPageName);

  return (
    <div className="min-h-screen bg-slate-50">
      {layoutFlags.useShell && <TopNav {...topNavProps} />}

      <main
        className={cn(
          'w-full px-4 py-4 lg:px-6 lg:py-6 pb-[calc(1.5rem+var(--status-bar-height))]',
          layoutFlags.contentWidth === 'full' && 'max-w-none',
          layoutFlags.contentWidth === 'wide' && 'mx-auto max-w-7xl',
          layoutFlags.contentWidth === 'default' && 'mx-auto max-w-4xl',
          contentClassName,
        )}
      >
        {children}
      </main>

      {layoutFlags.useShell && <AppStatusBar {...statusBarProps} />}
    </div>
  );
}
