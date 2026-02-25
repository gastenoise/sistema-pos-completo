import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { BusinessProvider } from '@/components/pos/BusinessContext';
import { CartProvider } from '@/components/pos/CartContext';
import { AuthorizationProvider, useAuthorization } from '@/components/auth/AuthorizationContext';
import { useBusiness } from '@/components/pos/BusinessContext';
import Login from './pages/Login';
import { Button } from '@/components/ui/button';
import GlobalLoadingOverlay from '@/components/common/GlobalLoadingOverlay';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const PermissionGuard = ({
  canAccess,
  redirectTo = '/POS',
  message = 'No tenés permisos para acceder a esta sección.',
  children,
}) => {
  useEffect(() => {
    if (!canAccess) {
      toast.error(message);
    }
  }, [canAccess, message]);

  if (!canAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

const AuthenticatedApp = () => {
  const {
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    navigateToLogin,
    sessionExpired,
    acknowledgeSessionExpired
  } = useAuth();
  const location = useLocation();
  const { businessId } = useBusiness();
  const { can, isLoading: isLoadingAuthorization } = useAuthorization();
  const isLoginRoute = location.pathname === '/login';
  const isHomeRoute = location.pathname === '/Home';
  const isBusinessSelectRoute = location.pathname === '/BusinessSelect';


  if (isLoginRoute && isAuthenticated && !isLoadingAuth) {
    return <Navigate to="/Home" replace />;
  }


  const requiresBusinessContext = !isLoginRoute && !isHomeRoute && !isBusinessSelectRoute;

  if (isAuthenticated && !isLoadingAuth && requiresBusinessContext && !businessId) {
    return <Navigate to="/Home" replace />;
  }

  // Show loading spinner while checking app public settings, auth, or authorization
  if (!isLoginRoute && (isLoadingPublicSettings || isLoadingAuth || (requiresBusinessContext && isLoadingAuthorization))) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (!isLoginRoute && authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }


  // Frontend guard is UX-only; backend permission checks remain the source of truth.
  const routePermissions = {
    CashRegister: 'cash_register.view',
    Settings: 'settings.permissions.manage',
  };

  const canAccessRoute = (path) => {
    const requiredPermission = routePermissions[path];
    return !requiredPermission || can(requiredPermission);
  };

  // Render the main app
  return (
    <>
      {!isLoginRoute && (
        <Dialog open={sessionExpired} onOpenChange={(open) => !open && acknowledgeSessionExpired()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Session expired</DialogTitle>
              <DialogDescription>
                Your session has ended. Please sign in again to continue.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button onClick={acknowledgeSessionExpired}>Go to login</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              path === 'CashRegister' ? (
                <PermissionGuard
                  canAccess={canAccessRoute(path)}
                  redirectTo="/POS"
                  message="No tenés permisos para ver Caja."
                >
                  <LayoutWrapper currentPageName={path}>
                    <Page />
                  </LayoutWrapper>
                </PermissionGuard>
              ) : canAccessRoute(path) ? (
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              ) : <Navigate to="/POS" replace />
            }
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <BusinessProvider>
          <AuthorizationProvider>
            <CartProvider>
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <NavigationTracker />
                <GlobalLoadingOverlay />
                <AuthenticatedApp />
              </Router>
            </CartProvider>
          </AuthorizationProvider>
        </BusinessProvider>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
