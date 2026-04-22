export const ITEMS_PER_PAGE = 20;

export const itemsQueryKey = (businessId, searchQuery, barcodeOrSku, categoryFilter, source, onlyPriceUpdated, onlyWithPrice, page) =>
  ['items', businessId, searchQuery, barcodeOrSku, categoryFilter, source, onlyPriceUpdated, onlyWithPrice, page];

export const buildItemsQueryOptions = ({
  businessId,
  searchQuery,
  barcodeOrSku,
  categoryFilter,
  source,
  onlyPriceUpdated,
  onlyWithPrice,
  page,
}, deps) => ({
  queryKey: itemsQueryKey(businessId, searchQuery, barcodeOrSku, categoryFilter, source, onlyPriceUpdated, onlyWithPrice, page),
  queryFn: () => deps.getItems({
    search: searchQuery,
    barcode_or_sku: barcodeOrSku,
    category: categoryFilter,
    source,
    only_price_updated: onlyPriceUpdated,
    only_with_price: onlyWithPrice,
    page,
    per_page: ITEMS_PER_PAGE
  }),
  enabled: Boolean(businessId)
});

export const invalidateItemsQueries = (queryClient, businessId) =>
  queryClient.invalidateQueries({ queryKey: ['items', businessId] });
