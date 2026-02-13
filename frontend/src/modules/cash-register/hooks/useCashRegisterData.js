import { useMutation, useQuery } from '@tanstack/react-query';
import {
  closeCashRegister,
  getCashRegisterStatus,
  getClosedCashSessions,
  getExpectedTotals,
  openCashRegister
} from '@/api/cash-register';

export const useCashStatusQuery = (businessId) => useQuery({
  queryKey: ['cashSession', businessId],
  queryFn: getCashRegisterStatus,
  enabled: Boolean(businessId)
});

export const useClosedSessionsQuery = (businessId) => useQuery({
  queryKey: ['recentSessions', businessId],
  queryFn: getClosedCashSessions,
  enabled: Boolean(businessId)
});

export const useExpectedTotalsQuery = (sessionId) => useQuery({
  queryKey: ['expectedTotals', sessionId],
  queryFn: () => getExpectedTotals(sessionId),
  enabled: Boolean(sessionId)
});

export const useOpenRegisterMutation = () => useMutation({ mutationFn: openCashRegister });
export const useCloseRegisterMutation = () => useMutation({ mutationFn: closeCashRegister });

export function useCashRegisterData() {
  return { pageSizeTarget: 300 };
}
