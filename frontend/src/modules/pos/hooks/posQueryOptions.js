export const posItemsQueryKey = (businessId, search, barcode, limit) => ['pos-items', businessId, search, barcode, limit];

export const buildPosItemsQueryOptions = (
  businessId,
  { search = '', barcode = '', limit = 20 } = {},
  deps
) => ({
  queryKey: posItemsQueryKey(businessId, search, barcode, limit),
  queryFn: () => deps.getPosItems({ search, barcode, limit }),
  enabled: Boolean(businessId) && (search.trim().length > 0 || barcode.trim().length > 0)
});

export const invalidatePosQueries = (queryClient, businessId) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ['pos-items', businessId] }),
    queryClient.invalidateQueries({ queryKey: ['latest-closed-sale', businessId] }),
  ]);
