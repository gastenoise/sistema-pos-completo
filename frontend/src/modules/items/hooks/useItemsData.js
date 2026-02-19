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
  page,
}) => useQuery({
  queryKey: ['items', businessId, searchQuery, barcode, categoryFilter, source, onlySepaPriceOverridden, page],
  queryFn: () => getItems({
    search: searchQuery,
    barcode,
    category: categoryFilter,
    source,
    only_sepa_price_overridden: onlySepaPriceOverridden,
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
