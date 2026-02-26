import { useMutation, useQuery } from '@tanstack/react-query';
import {
  bulkUpdateItems,
  confirmItemsImport,
  deleteItem,
  getCategories,
  getItems,
  previewItemsImport,
  previewItemsImportPage,
  saveItem,
  saveSepaItemPrice
} from '@/api/items';
import { buildItemsQueryOptions, invalidateItemsQueries, ITEMS_PER_PAGE, itemsQueryKey } from './itemsQueryOptions';

export { ITEMS_PER_PAGE, buildItemsQueryOptions, invalidateItemsQueries, itemsQueryKey };

export const useItemsQuery = ({
  businessId,
  searchQuery,
  barcodeOrSku,
  categoryFilter,
  source,
  onlyPriceUpdated,
  page,
}) => useQuery(buildItemsQueryOptions(
  { businessId, searchQuery, barcodeOrSku, categoryFilter, source, onlyPriceUpdated, page },
  { getItems }
));

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
  mutationFn: ({ file, previewId, page, perPage }: any) => previewItemsImportPage({ file, previewId, page, perPage })
});
export const useConfirmItemsImportMutation = () => useMutation({ mutationFn: confirmItemsImport });

export function useItemsData() {
  return { pageSizeTarget: 300 };
}
