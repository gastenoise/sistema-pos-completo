import { mapCatalogIsActive, withCatalogIsActive } from '../lib/catalogNaming';
import { normalizeListResponse } from '../lib/normalizeResponse';

const toNumberOrNull = (value) => (value === null || value === undefined || value === '' ? null : Number(value));

const isObject = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));

const pickPaginationSource = (response) => {
  const nestedData = response?.data;

  if (isObject(nestedData?.meta)) {
    return {
      ...nestedData.meta,
      next_cursor: nestedData?.next_cursor ?? nestedData?.meta?.next_cursor ?? null,
    };
  }

  if (isObject(response?.meta)) {
    return {
      ...response.meta,
      next_cursor: response?.next_cursor ?? response?.meta?.next_cursor ?? null,
    };
  }

  if (isObject(response?.pagination)) {
    return {
      ...response.pagination,
      next_cursor: response?.next_cursor ?? response?.pagination?.next_cursor ?? null,
    };
  }

  if (Array.isArray(response?.data) || Array.isArray(response?.items)) {
    return response;
  }

  return null;
};

const toPagination = (source) => {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const hasCursor = source.next_cursor !== undefined && source.next_cursor !== null && source.next_cursor !== '';
  const hasOffsetPagination = ['current_page', 'last_page', 'per_page', 'total', 'from', 'to']
    .some((key) => source[key] !== undefined && source[key] !== null);

  if (!hasOffsetPagination && !hasCursor) {
    return null;
  }

  return {
    current_page: source.current_page ?? null,
    last_page: source.last_page ?? null,
    per_page: source.per_page ?? null,
    total: source.total ?? null,
    from: source.from ?? null,
    to: source.to ?? null,
    next_cursor: source.next_cursor ?? null,
  };
};

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
  const pagination = toPagination(pickPaginationSource(response));

  return { items: list, pagination };
};
