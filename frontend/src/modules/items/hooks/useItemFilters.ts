import { useEffect, useMemo, useState } from 'react';
import {
  loadFilterState,
  saveFilterState,
  clearFilterState,
  hasNonDefaultFilters,
} from '@/lib/filterStorage';

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
  storageKey = null as string | null,
} = {}) => {
  const mergedInitialFilters = useMemo(() => {
    const baseDefaults = {
      ...DEFAULT_ITEM_FILTERS,
      ...initialFilters,
    };

    if (storageKey) {
      return loadFilterState(storageKey, baseDefaults);
    }

    return baseDefaults;
  }, [storageKey, JSON.stringify(initialFilters)]);

  const [searchQuery, setSearchQuery] = useState(mergedInitialFilters.search);
  const [barcodeOrSkuQuery, setBarcodeOrSkuQuery] = useState(mergedInitialFilters.barcodeOrSku);
  const [categoryFilter, setCategoryFilter] = useState(mergedInitialFilters.category);
  const [sourceFilter, setSourceFilter] = useState(mergedInitialFilters.source);
  const [onlyPriceUpdated, setOnlyPriceUpdated] = useState(Boolean(mergedInitialFilters.onlyPriceUpdated));
  const [page, setPage] = useState(initialPage);

  // Persistence
  useEffect(() => {
    if (!storageKey) return;

    const currentFilters = {
      search: searchQuery,
      barcodeOrSku: barcodeOrSkuQuery,
      category: categoryFilter,
      source: sourceFilter,
      onlyPriceUpdated,
    };

    if (hasNonDefaultFilters(currentFilters, DEFAULT_ITEM_FILTERS)) {
      saveFilterState(storageKey, currentFilters);
    } else {
      clearFilterState(storageKey);
    }
  }, [storageKey, searchQuery, barcodeOrSkuQuery, categoryFilter, sourceFilter, onlyPriceUpdated]);

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

  const activeFilters = useMemo(() => ({
    search: searchQuery,
    barcodeOrSku: barcodeOrSkuQuery,
    category: categoryFilter,
    source: sourceFilter,
    onlyPriceUpdated,
  }), [searchQuery, barcodeOrSkuQuery, categoryFilter, sourceFilter, onlyPriceUpdated]);

  const hasActiveFilters = useMemo(() => (
    hasNonDefaultFilters(activeFilters, DEFAULT_ITEM_FILTERS)
  ), [activeFilters]);

  const resetFilters = () => {
    setSearchQuery(DEFAULT_ITEM_FILTERS.search);
    setBarcodeOrSkuQuery(DEFAULT_ITEM_FILTERS.barcodeOrSku);
    setCategoryFilter(DEFAULT_ITEM_FILTERS.category);
    setSourceFilter(DEFAULT_ITEM_FILTERS.source);
    setOnlyPriceUpdated(DEFAULT_ITEM_FILTERS.onlyPriceUpdated);
    setPage(initialPage);

    if (storageKey) {
      clearFilterState(storageKey);
    }
  };

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
    hasActiveFilters,
    resetFilters,
  };
};
