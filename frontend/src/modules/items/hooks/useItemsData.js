import { useMutation, useQuery } from '@tanstack/react-query';
import {
  bulkUpdateItems,
  confirmItemsImport,
  getCategories,
  getItems,
  previewItemsImport,
  previewItemsImportPage,
  saveItem,
  saveSepaItemPrice,
  deleteItem
} from '@/api/items';

export const ITEMS_PER_PAGE = 20;

export const useItemsQuery = ({
  businessId,
  searchQuery,
  barcode,
  categoryFilter,
  source,
  priceUpdated,
  page,
}) => useQuery({
  queryKey: ['items', businessId, searchQuery, barcode, categoryFilter, source, onlySepaPriceOverridden, page],
  queryFn: () => getItems({
    search: searchQuery,
    barcode,
    category: categoryFilter,
    source,
    price_updated: priceUpdated,
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
export const useSaveSepaPriceMutation = () => useMutation({ mutationFn: saveSepaItemPrice });
export const useDeleteItemMutation = () => useMutation({ mutationFn: deleteItem });
export const useBulkItemsMutation = () => useMutation({ mutationFn: bulkUpdateItems });
export const usePreviewItemsImportMutation = () => useMutation({ mutationFn: previewItemsImport });
export const usePreviewItemsImportPageMutation = () => useMutation({
  mutationFn: ({ file, previewId, page, perPage }) => previewItemsImportPage({ file, previewId, page, perPage })
});
export const useConfirmItemsImportMutation = () => useMutation({ mutationFn: confirmItemsImport });

export function useItemsData() {
  return { pageSizeTarget: 300 };
}
