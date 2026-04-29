import { apiClient } from './client';
import { mapCatalogIsActive } from '@/lib/catalogNaming';
import { normalizeEntityResponse, normalizeListResponse } from '@/lib/normalizeResponse';
import { normalizeItem, normalizeItemsPage } from './items.normalize';

export { normalizeItemsPage } from './items.normalize';

export const getItems = async (params) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (key === 'only_sepa_price_overridden' && value !== true) return;
    if (value !== undefined && value !== null && value !== '' && value !== 'all' && value !== false) {
      query.set(key, String(value));
    }
  });

  return normalizeItemsPage(await apiClient.get(`/protected/items?${query.toString()}`));
};

export const getCategories = async () => mapCatalogIsActive(normalizeListResponse(await apiClient.get('/protected/categories'), 'categories')).map((category) => ({
  ...category,
  id: Number(category.id)
}));

export const saveItem = async (itemData) => {
  const response = itemData.id
    ? await apiClient.put(`/protected/items/${itemData.id}`, itemData)
    : await apiClient.post('/protected/items', itemData);

  return normalizeItem(normalizeEntityResponse(response));
};

export const saveSepaItemPrice = async (itemData) => {
  const sepaItemId = itemData?.sepa_item_id ?? itemData?.id;
  const response = await apiClient.put(`/protected/sepa-items/${sepaItemId}/price`, {
    price: itemData.price ?? null,
    category_id: itemData.category_id ?? null
  });

  return normalizeItem(normalizeEntityResponse(response));
};

export const deleteItem = (itemId) => apiClient.delete(`/protected/items/${itemId}`);

export const bulkUpdateItems = async (payload) => normalizeEntityResponse(await apiClient.patch('/protected/items/bulk', payload));

export const previewItemsImport = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return normalizeEntityResponse(await apiClient.post('/protected/items-import/preview', formData));
};

export const previewItemsImportPage = async ({ file = null, previewId = null, page, perPage }) => {
  const formData = new FormData();
  if (file) formData.append('file', file);
  if (previewId) formData.append('preview_id', previewId);
  formData.append('page', String(page));
  formData.append('per_page', String(perPage));
  return normalizeEntityResponse(await apiClient.post('/protected/items-import/preview/full', formData));
};

export const confirmItemsImport = async (payload) => normalizeEntityResponse(await apiClient.post('/protected/items-import/confirm', payload));
