import { useMutation, useQuery } from '@tanstack/react-query';
import {
  closeCashRegister,
  getCashRegisterStatus,
  getClosedCashSessions,
  getExpectedTotals,
  openCashRegister
} from '@/api/cash-register';
import { buildCashStatusQueryOptions, cashStatusQueryKey, invalidateCashRegisterQueries } from './cashRegisterQueryOptions';

export { buildCashStatusQueryOptions, cashStatusQueryKey, invalidateCashRegisterQueries };

export const useCashStatusQuery = (businessId, isEnabled = true) => useQuery(buildCashStatusQueryOptions(businessId, isEnabled, { getCashRegisterStatus }));

export const useClosedSessionsQuery = (businessId, isEnabled = true) => useQuery({
  queryKey: ['recentSessions', businessId],
  queryFn: getClosedCashSessions,
  enabled: Boolean(businessId) && isEnabled
});

export const useExpectedTotalsQuery = (sessionId, isEnabled = true) => useQuery({
  queryKey: ['expectedTotals', sessionId],
  queryFn: () => getExpectedTotals(sessionId),
  enabled: Boolean(sessionId) && isEnabled
});

export const useOpenRegisterMutation = () => useMutation({ mutationFn: openCashRegister });
export const useCloseRegisterMutation = () => useMutation({ mutationFn: closeCashRegister });

export function useCashRegisterData() {
  return { pageSizeTarget: 300 };
}
