import { request } from './client';
import { mapCatalogIsActive } from '@/lib/catalogNaming';
import { normalizeEntityResponse, normalizeListResponse } from '@/lib/normalizeResponse';
import { normalizeItem, normalizeItemsPage } from './items.normalize';

export { normalizeItemsPage } from './items.normalize';

export const getItems = async (params) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (key === 'only_sepa_price_overridden' && value !== true) {
      return;
    }

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


export const saveSepaItemPrice = async (itemData) => {
  const sepaItemId = itemData?.sepa_item_id ?? itemData?.id;
  const response = await request(`/protected/sepa-items/${sepaItemId}/price`, {
    method: 'PUT',
    body: {
      price: itemData.price ?? null,
      category_id: itemData.category_id ?? null
    }
  });

  return normalizeItem(normalizeEntityResponse(response));
};

export const deleteItem = async (itemId) => request(`/protected/items/${itemId}`, { method: 'DELETE' });

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

export const previewItemsImportPage = async ({ file = null, previewId = null, page, perPage }) => {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  if (previewId) {
    formData.append('preview_id', previewId);
  }
  formData.append('page', String(page));
  formData.append('per_page', String(perPage));
  const response = await request('/protected/items-import/preview/full', { method: 'POST', body: formData });
  return response?.data ?? response;
};

export const confirmItemsImport = async (payload) => request('/protected/items-import/confirm', {
  method: 'POST',
  body: payload
});
