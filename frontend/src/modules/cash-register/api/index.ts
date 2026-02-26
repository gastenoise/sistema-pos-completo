import { request } from '@/api/client';
import { normalizeListResponse } from '@/lib/normalizeResponse';

export const getCashRegisterStatus = async () => {
  const response = await request('/protected/cash-register/status');
  const status = response?.status || (response?.data?.is_open ? 'open' : 'closed');
  const session = response?.session || response?.data?.session;
  if (status === 'open' && session) {
    return { status, ...session };
  }
  return null;
};

export const getClosedCashSessions = async () => {
  const response = await request('/protected/cash-register/sessions/closed');
  return normalizeListResponse(response, 'sessions');
};

export const getExpectedTotals = async (sessionId) => {
  const response = await request(`/protected/cash-register/${sessionId}/expected-totals`);
  return response?.data ?? response ?? {};
};

export const openCashRegister = async (amount) => request('/protected/cash-register/open', {
  method: 'POST',
  body: { amount: Number(amount) || 0 }
});

export const closeCashRegister = async (realCash) => request('/protected/cash-register/close', {
  method: 'POST',
  body: { real_cash: Number(realCash) || 0 }
});
