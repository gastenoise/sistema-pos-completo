import { request } from './client';
import { mapCatalogIsActive, withCatalogIsActive } from '@/lib/catalogNaming';
import { normalizeEntityResponse, normalizeListResponse } from '@/lib/normalizeResponse';

const toNumberOrNull = (value) => (value === null || value === undefined || value === '' ? null : Number(value));

const normalizeItem = (item) => ({
  ...withCatalogIsActive(item),
  category_id: toNumberOrNull(item?.category_id),
  presentation_quantity: toNumberOrNull(item?.presentation_quantity),
  list_price: toNumberOrNull(item?.list_price)
});

export const normalizeItemsPage = (response) => {
  const list = mapCatalogIsActive(normalizeListResponse(response, 'items')).map(normalizeItem);
  const paginationSource = response?.data && Array.isArray(response?.data?.data) ? response.data : response;
  const pagination = paginationSource && Array.isArray(paginationSource?.data)
    ? {
        current_page: paginationSource.current_page,
        last_page: paginationSource.last_page,
        per_page: paginationSource.per_page,
        total: paginationSource.total,
        from: paginationSource.from,
        to: paginationSource.to
      }
    : null;

  return { items: list, pagination };
};

export const getItems = async (params) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      query.set(key, String(value));
    }
  });

  const response = await request(`/protected/items?${query.toString()}`);
  return normalizeItemsPage(response);
};

export const getCategories = async () => {
  const response = await request('/protected/categories');
  return mapCatalogIsActive(normalizeListResponse(response, 'categories')).map((category) => ({
    ...category,
    id: Number(category.id)
  }));
};

export const saveItem = async (itemData) => {
  const response = itemData.id
    ? await request(`/protected/items/${itemData.id}`, { method: 'PUT', body: itemData })
    : await request('/protected/items', { method: 'POST', body: itemData });

  return normalizeItem(normalizeEntityResponse(response));
};

export const toggleItemStatus = async (item) => {
  const response = await request(`/protected/items/${item.id}`, {
    method: 'PUT',
    body: { active: !item.is_active }
  });

  return normalizeItem(normalizeEntityResponse(response));
};

export const bulkUpdateItems = async (payload) => request('/protected/items/bulk', {
  method: 'PATCH',
  body: payload
});

export const previewItemsImport = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('/protected/items-import/preview', { method: 'POST', body: formData });
  return response?.data ?? response;
};

export const previewItemsImportPage = async (file, page, perPage) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('page', String(page));
  formData.append('per_page', String(perPage));
  const response = await request('/protected/items-import/preview/full', { method: 'POST', body: formData });
  return response?.data ?? response;
};

export const confirmItemsImport = async (payload) => request('/protected/items-import/confirm', {
  method: 'POST',
  body: payload
});
