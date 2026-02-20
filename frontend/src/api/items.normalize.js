import { mapCatalogIsActive, withCatalogIsActive } from '../lib/catalogNaming.js';
import { normalizeListResponse } from '../lib/normalizeResponse.js';

const toNumberOrNull = (value) => (value === null || value === undefined || value === '' ? null : Number(value));

export const normalizeItem = (item) => ({
  ...withCatalogIsActive(item),
  category_id: toNumberOrNull(item?.category_id),
  presentation_quantity: toNumberOrNull(item?.presentation_quantity),
  list_price: toNumberOrNull(item?.list_price),
  source: item?.source || 'local',
  sepa_item_id: toNumberOrNull(item?.sepa_item_id),
  is_price_overridden: Boolean(item?.is_price_overridden)
});

export const normalizeItemsPage = (response) => {
  const list = mapCatalogIsActive(normalizeListResponse(response, 'items')).map(normalizeItem);
  const laravelMeta = response?.data?.meta;
  const paginationSource = laravelMeta
    ? { ...laravelMeta, next_cursor: response?.data?.next_cursor || null }
    : response;
  const hasLaravelPagination = laravelMeta && typeof laravelMeta === 'object';
  const hasLegacyPagination = paginationSource && Array.isArray(paginationSource?.data);
  const pagination = hasLaravelPagination || hasLegacyPagination
    ? {
        current_page: paginationSource.current_page,
        last_page: paginationSource.last_page,
        per_page: paginationSource.per_page,
        total: paginationSource.total,
        from: paginationSource.from,
        to: paginationSource.to,
        next_cursor: paginationSource.next_cursor || null
      }
    : null;

  return { items: list, pagination };
};
