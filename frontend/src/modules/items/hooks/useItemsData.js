import { useMutation, useQuery } from '@tanstack/react-query';
import {
  bulkUpdateItems,
  confirmItemsImport,
  getCategories,
  getItems,
  previewItemsImport,
  previewItemsImportPage,
  saveItem,
  toggleItemStatus
} from '@/api/items';

export const ITEMS_PER_PAGE = 20;

export const useItemsQuery = ({ businessId, searchQuery, categoryFilter, page }) => useQuery({
  queryKey: ['items', businessId, searchQuery, categoryFilter, page],
  queryFn: () => getItems({
    search: searchQuery,
    category: categoryFilter,
    page,
    per_page: ITEMS_PER_PAGE
  }),
  enabled: Boolean(businessId)
});

export const useItemCategoriesQuery = (businessId) => useQuery({
  queryKey: ['categories', businessId],
  queryFn: getCategories,
  enabled: Boolean(businessId)
});

export const useSaveItemMutation = () => useMutation({ mutationFn: saveItem });
export const useToggleItemStatusMutation = () => useMutation({ mutationFn: toggleItemStatus });
export const useBulkItemsMutation = () => useMutation({ mutationFn: bulkUpdateItems });
export const usePreviewItemsImportMutation = () => useMutation({ mutationFn: previewItemsImport });
export const usePreviewItemsImportPageMutation = () => useMutation({
  mutationFn: ({ file, page, perPage }) => previewItemsImportPage(file, page, perPage)
});
export const useConfirmItemsImportMutation = () => useMutation({ mutationFn: confirmItemsImport });

export function useItemsData() {
  return { pageSizeTarget: 300 };
}
