import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { fetchMe, login as loginRequest, logout as logoutRequest, updateMe } from '@/api/auth';
import { clearBusinessContext } from '@/api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionExpiredReason, setSessionExpiredReason] = useState('session_expired');

  useEffect(() => {
    checkAppState();
  }, []);

  const navigateToLogin = useCallback((reason = null) => {
    const redirect = `${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams();
    params.set('redirect', redirect);
    if (reason) {
      params.set('reason', reason);
    }
    window.location.href = `/login?${params.toString()}`;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleSessionExpired = (event) => {
      const reason = event?.detail?.reason || 'session_expired';
      setSessionExpiredReason(reason);
      setSessionExpired(true);
      setUser(null);
      setIsAuthenticated(false);
      navigateToLogin(reason);
    };
    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, [navigateToLogin]);

  const checkAppState = async () => {
    setIsLoadingPublicSettings(true);
    setAuthError(null);

    try {
      await checkUserAuth();
      setAppPublicSettings({ id: 'local', public_settings: {} });
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      } else {
        setAuthError({
          type: 'unknown',
          message: error.message || 'Failed to load app'
        });
      }
    } finally {
      setIsLoadingPublicSettings(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await fetchMe();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    setAuthError(null);
    setIsLoadingAuth(true);
    try {
      clearBusinessContext();
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('pos_current_business');
        window.localStorage.removeItem('pos_businesses');
      }

      await loginRequest(email, password);
      const currentUser = await fetchMe();
      setUser(currentUser);
      setIsAuthenticated(true);
      return currentUser;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: 'auth_failed',
        message: error.message || 'Failed to login'
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const updateUser = async (updates) => {
    const nextUser = await updateMe(updates);
    setUser(nextUser);
    return nextUser;
  };

  const logout = async (shouldRedirect = true) => {
    await logoutRequest();
    clearBusinessContext();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('pos_current_business');
      window.localStorage.removeItem('pos_businesses');
    }
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const acknowledgeSessionExpired = () => {
    setSessionExpired(false);
    navigateToLogin(sessionExpiredReason);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      sessionExpired,
      login,
      updateUser,
      logout,
      navigateToLogin,
      sessionExpiredReason,
      acknowledgeSessionExpired,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
