export const ITEMS_PER_PAGE = 20;

export const itemsQueryKey = (businessId, searchQuery, barcodeOrSku, categoryFilter, source, onlyPriceUpdated, page) =>
  ['items', businessId, searchQuery, barcodeOrSku, categoryFilter, source, onlyPriceUpdated, page];

export const buildItemsQueryOptions = ({
  businessId,
  searchQuery,
  barcodeOrSku,
  categoryFilter,
  source,
  onlyPriceUpdated,
  page,
}, deps) => ({
  queryKey: itemsQueryKey(businessId, searchQuery, barcodeOrSku, categoryFilter, source, onlyPriceUpdated, page),
  queryFn: () => deps.getItems({
    search: searchQuery,
    barcode_or_sku: barcodeOrSku,
    category: categoryFilter,
    source,
    only_price_updated: onlyPriceUpdated,
    page,
    per_page: ITEMS_PER_PAGE
  }),
  enabled: Boolean(businessId)
});

export const invalidateItemsQueries = (queryClient, businessId) =>
  queryClient.invalidateQueries({ queryKey: ['items', businessId] });
