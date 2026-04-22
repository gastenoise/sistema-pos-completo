import { useEffect, useMemo, useState } from 'react';

export const DEFAULT_ITEM_FILTERS = {
  search: '',
  barcodeOrSku: '',
  category: 'all',
  source: 'all',
  onlyPriceUpdated: false,
  onlyWithPrice: false,
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
  const [onlyWithPrice, setOnlyWithPrice] = useState(Boolean(mergedInitialFilters.onlyWithPrice));
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    if (!withPagination) {
      return;
    }

    setPage(1);
  }, [withPagination, searchQuery, barcodeOrSkuQuery, categoryFilter, sourceFilter, onlyPriceUpdated, onlyWithPrice]);

  const apiFilters = useMemo(() => ({
    search: searchQuery.trim(),
    barcode_or_sku: barcodeOrSkuQuery.trim(),
    category: categoryFilter,
    source: sourceFilter,
    only_price_updated: onlyPriceUpdated,
    only_with_price: onlyWithPrice,
  }), [searchQuery, barcodeOrSkuQuery, categoryFilter, sourceFilter, onlyPriceUpdated, onlyWithPrice]);

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
    onlyWithPrice,
    setOnlyWithPrice,
    page,
    setPage,
    apiFilters,
  };
};
