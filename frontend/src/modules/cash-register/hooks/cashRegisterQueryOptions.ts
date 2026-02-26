export const cashStatusQueryKey = (businessId) => ['cashSession', businessId];

export const buildCashStatusQueryOptions = (businessId, isEnabled = true, deps) => ({
  queryKey: cashStatusQueryKey(businessId),
  queryFn: deps.getCashRegisterStatus,
  enabled: Boolean(businessId) && isEnabled
});

export const invalidateCashRegisterQueries = (queryClient, businessId) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: cashStatusQueryKey(businessId) }),
    queryClient.invalidateQueries({ queryKey: ['recentSessions', businessId] }),
  ]);
