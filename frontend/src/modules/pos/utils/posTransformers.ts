import { normalizeListResponse } from '@/lib/normalizeResponse';
import { mapCatalogIsActive } from '@/lib/catalogNaming';

export const buildPosItemsSearchParams = ({
  sourceFilter,
  searchQuery,
  barcodeOrSkuQuery,
  categoryFilter,
  onlyPriceUpdated,
  perPage = 24,
}) => {
  const query = new URLSearchParams();
  query.set('source', sourceFilter);
  query.set('per_page', String(perPage));

  const trimmedSearch = searchQuery.trim();
  const trimmedBarcodeOrSku = barcodeOrSkuQuery.trim();

  if (trimmedSearch) query.set('search', trimmedSearch);
  if (trimmedBarcodeOrSku) query.set('barcode_or_sku', trimmedBarcodeOrSku);
  if (categoryFilter !== 'all') query.set('category', categoryFilter);
  if (onlyPriceUpdated) query.set('only_price_updated', 'true');
  if (!trimmedSearch && !trimmedBarcodeOrSku && sourceFilter === 'all' && categoryFilter === 'all') {
    query.set('recent_first', 'true');
  }

  return query;
};

export const normalizePosItems = (response) => mapCatalogIsActive(normalizeListResponse(response, 'items')).map((item) => ({
  ...item,
  category_id: item.category_id !== null && item.category_id !== undefined ? Number(item.category_id) : null,
}));

export const normalizePosCategories = (response) => mapCatalogIsActive(normalizeListResponse(response, 'categories')).map((category) => ({
  ...category,
  id: Number(category.id),
}));

export const normalizePosPaymentMethods = (response) => normalizeListResponse(response, 'payment_methods')
  .map((method) => ({
    ...method,
    type: method.type || method.code,
  }))
  .filter((method) => (method.is_active ?? method.active) !== false);

export const createPaymentMethodLookup = (paymentMethods = []) => paymentMethods.reduce((acc, method) => {
  if (method.code) acc[method.code] = method;
  if (method.type) acc[method.type] = method;
  return acc;
}, {});
