import { useEffect, useMemo, useState } from 'react';

export const DEFAULT_ITEM_FILTERS = {
  search: '',
  barcodeOrSku: '',
  category: 'all',
  source: 'all',
  onlyPriceUpdated: false,
};

export const useItemFilters = ({
  withPagination = false,
  initialFilters = {},
  initialPage = 1,
} = {}) => {
  const mergedInitialFilters = {
    ...DEFAULT_ITEM_FILTERS,
    ...initialFilters,
  };

  const [searchQuery, setSearchQuery] = useState(mergedInitialFilters.search);
  const [barcodeOrSkuQuery, setBarcodeOrSkuQuery] = useState(mergedInitialFilters.barcodeOrSku);
  const [categoryFilter, setCategoryFilter] = useState(mergedInitialFilters.category);
  const [sourceFilter, setSourceFilter] = useState(mergedInitialFilters.source);
  const [onlyPriceUpdated, setOnlyPriceUpdated] = useState(Boolean(mergedInitialFilters.onlyPriceUpdated));
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    if (!withPagination) {
      return;
    }

    setPage(1);
  }, [withPagination, searchQuery, barcodeOrSkuQuery, categoryFilter, sourceFilter, onlyPriceUpdated]);

  const apiFilters = useMemo(() => ({
    search: searchQuery.trim(),
    barcode_or_sku: barcodeOrSkuQuery.trim(),
    category: categoryFilter,
    source: sourceFilter,
    only_price_updated: onlyPriceUpdated,
  }), [searchQuery, barcodeOrSkuQuery, categoryFilter, sourceFilter, onlyPriceUpdated]);

  return {
    searchQuery,
    setSearchQuery,
    barcodeOrSkuQuery,
    setBarcodeOrSkuQuery,
    categoryFilter,
    setCategoryFilter,
    sourceFilter,
    setSourceFilter,
    onlyPriceUpdated,
    setOnlyPriceUpdated,
    page,
    setPage,
    apiFilters,
  };
};
