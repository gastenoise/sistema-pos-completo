import { apiClient } from './client';
import { normalizeEntityResponse, normalizeListResponse } from '@/lib/normalizeResponse';

export const getCashRegisterStatus = async () => {
  const response = await apiClient.get('/protected/cash-register/status');
  const status = response?.status || (response?.data?.is_open ? 'open' : 'closed');
  const session = response?.session || response?.data?.session;
  if (status === 'open' && session) {
    return { status, ...session };
  }
  return null;
};

export const getClosedCashSessions = async () => normalizeListResponse(await apiClient.get('/protected/cash-register/sessions/closed'), 'sessions');

export const getExpectedTotals = async (sessionId) => normalizeEntityResponse(await apiClient.get(`/protected/cash-register/${sessionId}/expected-totals`)) ?? {};

export const openCashRegister = (amount) => apiClient.post('/protected/cash-register/open', { amount: Number(amount) || 0 });

export const closeCashRegister = (realCash) => apiClient.post('/protected/cash-register/close', { real_cash: Number(realCash) || 0 });
