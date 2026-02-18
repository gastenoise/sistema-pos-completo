import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
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

export const useItemsQuery = ({
  businessId,
  searchQuery,
  barcode,
  categoryFilter,
  source,
  onlySepaPriceOverridden,
}) => useInfiniteQuery({
  queryKey: ['items', businessId, searchQuery, barcode, categoryFilter, source, onlySepaPriceOverridden],
  queryFn: ({ pageParam = 1 }) => getItems({
    search: searchQuery,
    barcode,
    category: categoryFilter,
    source,
    only_sepa_price_overridden: onlySepaPriceOverridden,
    page: pageParam,
    per_page: ITEMS_PER_PAGE
  }),
  initialPageParam: 1,
  getNextPageParam: (lastPage) => {
    const current = Number(lastPage?.pagination?.current_page || 1);
    const last = Number(lastPage?.pagination?.last_page || 1);
    return current < last ? current + 1 : undefined;
  },
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
  mutationFn: ({ file, previewId, page, perPage }) => previewItemsImportPage({ file, previewId, page, perPage })
});
export const useConfirmItemsImportMutation = () => useMutation({ mutationFn: confirmItemsImport });

export function useItemsData() {
  return { pageSizeTarget: 300 };
}
