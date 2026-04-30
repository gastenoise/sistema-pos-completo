import { useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useBusiness } from '@/components/pos/BusinessContext';
import { useAuthorization } from '@/components/auth/AuthorizationContext';
import { getRouteMeta } from '@/routes/routeMeta';
import { useCashStatusQuery } from '@/modules/cash-register/hooks/useCashRegisterData';

export function useShellState(currentPageName: string) {
  const { user, logout } = useAuth();
  const { currentBusiness, businesses, selectBusiness, businessId } = useBusiness();
  const { role, can } = useAuthorization();

  const meta = useMemo(() => getRouteMeta(currentPageName), [currentPageName]);

  const shouldFetchCashStatus = meta.showStatusBar && (
    meta.statusBarContext === 'pos' ||
    meta.statusBarContext === 'cash_register'
  );

  // Only fetch cash status if user has permission and context requires it
  const canViewCash = can('view_cash_register');
  const { data: cashStatus } = useCashStatusQuery(
    businessId,
    !!businessId && shouldFetchCashStatus && canViewCash
  );

  const topNavProps = useMemo(() => ({
    user,
    onLogout: logout,
    currentPage: meta.label,
    currentBusiness,
    businesses,
    selectBusiness,
    can,
  }), [user, logout, meta.label, currentBusiness, businesses, selectBusiness, can]);

  const statusBarProps = useMemo(() => ({
    business: currentBusiness,
    role,
    can,
    cashStatus,
    context: meta.statusBarContext,
    visible: meta.showStatusBar,
  }), [currentBusiness, role, can, cashStatus, meta.statusBarContext, meta.showStatusBar]);

  const layoutFlags = useMemo(() => ({
    contentWidth: meta.contentWidth,
    useShell: meta.useShell,
  }), [meta.contentWidth, meta.useShell]);

  return {
    topNavProps,
    statusBarProps,
    layoutFlags,
    meta,
  };
}
