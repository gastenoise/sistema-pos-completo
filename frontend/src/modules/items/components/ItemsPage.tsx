import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Package, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import { TOAST_MESSAGES } from '@/lib/toastMessages';
import { mapApiErrorMessage } from '@/api/errorMapping';
import {
  useBulkItemsMutation,
  useConfirmItemsImportMutation,
  useItemCategoriesQuery,
  useItemsQuery,
  usePreviewItemsImportMutation,
  usePreviewItemsImportPageMutation,
  useSaveItemMutation,
  useSaveSepaPriceMutation,
  useDeleteItemMutation
} from '@/modules/items/hooks/useItemsData';

import { useBusiness } from '@/components/pos/BusinessContext';
import ItemRow from '@/components/pos/ItemRow';
import ItemEditorModal from '@/components/pos/ItemEditorModal';
import BulkActionsBar from '@/components/pos/BulkActionsBar';
import CsvImportWizard from '@/components/pos/CsvImportWizard';
import ItemsFiltersDialog from '@/components/items/ItemsFiltersDialog';
import { useItemFilters } from '@/modules/items/hooks/useItemFilters';
import { useKeyboardScanner } from '@/components/scanner/useKeyboardScanner';
import { BUSINESS_PARAMETER_IDS, normalizeBusinessParameters } from '@/lib/businessParameters';
import { handleItemsScanComplete, handlePendingItemsScanResolution } from '@/modules/pos/utils/scannerHandlers';

export default function Items() {
  const { businessId, currentBusiness, businesses } = useBusiness();
  const queryClient = useQueryClient();
  
  const {
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
  } = useItemFilters({ withPagination: true });
  const [selectedItems, setSelectedItems] = useState([]);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [barcodeInputHighlighted, setBarcodeInputHighlighted] = useState(false);
  const [pendingScannedCode, setPendingScannedCode] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  const getItemSelectionKey = (item) => `${item.source || 'local'}:${item.source === 'sepa' ? (item.sepa_item_id || item.id) : item.id}`;

  const buildBulkTargets = () => {
    const selectedSet = new Set(selectedItems);
    return (items as any[])
      .map((item) => {
        const key = getItemSelectionKey(item);
        if (!selectedSet.has(key)) return null;
        return {
          id: item.source === 'sepa' ? (item.sepa_item_id || item.id) : item.id,
          source: item.source === 'sepa' ? 'sepa' : 'local'
        };
      })
      .filter(Boolean);
  };


  const updateItemsCache = (entity) => {
    if (!entity?.id) return false;
    let updated = false;

    queryClient.setQueriesData({ queryKey: ['items', businessId] }, (prevData: any) => {
      const prev = prevData as any;
      if (!prev || !Array.isArray(prev.items)) {
        return prev;
      }

      const found = prev.items.some((item: any) => item.id === entity.id && item.source === (entity.source || 'local'));
      if (!found) {
        return prev;
      }

      updated = true;
      return {
        ...prev,
        items: (prev.items as any[]).map((item: any) => (
          item.id === entity.id && item.source === (entity.source || 'local')
            ? { ...item, ...entity }
            : item
        )),
      } as any;
    });

    return updated;
  };

  // Fetch items
  const {
    data: itemsResponseData,
    isLoading: loadingItems,
    isFetching: fetchingItems,
  } = useItemsQuery({
    businessId,
    searchQuery,
    barcodeOrSku: barcodeOrSkuQuery,
    categoryFilter,
    source: sourceFilter,
    onlyPriceUpdated,
    page,
  });

  // Fetch categories
  const { data: categories = [] } = useItemCategoriesQuery(businessId);

  const itemsResponse = itemsResponseData as any;
  const items = itemsResponse?.items || [];
  const pagination = itemsResponse?.pagination || null;
  const totalLoaded = items.length;
  const hasKnownTotal = pagination?.total !== null && pagination?.total !== undefined;
  const totalAvailable = hasKnownTotal ? pagination.total : totalLoaded;
  const hasOffsetPagination = pagination?.current_page !== null && pagination?.current_page !== undefined
    && pagination?.last_page !== null && pagination?.last_page !== undefined;
  const totalPages = hasOffsetPagination ? Number(pagination?.last_page || 1) : null;
  const currentPage = hasOffsetPagination ? Number(pagination?.current_page || page) : Number(page);
  const hasNextCursor = Boolean(pagination?.next_cursor);
  const selectedBusiness = businesses.find((business) => {
    const id = business?.business_id ?? business?.id;
    return String(id) === String(businessId);
  });
  const currentBusinessParameters: any = {
    ...normalizeBusinessParameters(selectedBusiness),
    ...normalizeBusinessParameters(currentBusiness),
  };
  const scannerEnabled = currentBusinessParameters[BUSINESS_PARAMETER_IDS.ENABLE_BARCODE_SCANNER] === true;
  const autoOpenCreateOnUnknownBarcodeEnabled = currentBusinessParameters[BUSINESS_PARAMETER_IDS.AUTO_OPEN_ITEM_CREATE_ON_UNKNOWN_BARCODE] === true;

  // Create/Update mutation
  const itemMutation = useSaveItemMutation();
  const sepaPriceMutation = useSaveSepaPriceMutation();
  const bulkMutation = useBulkItemsMutation();
  const deleteItemMutation = useDeleteItemMutation();
  const importPreviewMutation = usePreviewItemsImportMutation();
  const importPreviewPageMutation = usePreviewItemsImportPageMutation();
  const importConfirmMutation = useConfirmItemsImportMutation();

  const isMutatingItems = (
    itemMutation.isPending
    || sepaPriceMutation.isPending
    || bulkMutation.isPending
    || deleteItemMutation.isPending
    || importPreviewMutation.isPending
    || importPreviewPageMutation.isPending
    || importConfirmMutation.isPending
    || savingItem
    || bulkLoading
    || importLoading
  );
  const showItemsOverlay = !loadingItems && (fetchingItems || isMutatingItems);

  const appendCreatedItemToItemsCache = (createdItem: any) => {
    if (!createdItem?.id) {
      return;
    }

    queryClient.setQueriesData({ queryKey: ['items', businessId] }, (previous: any) => {
      if (!previous || !Array.isArray(previous.items)) {
        return previous;
      }

      const alreadyExists = previous.items.some((item: any) => String(item?.id) === String(createdItem.id));
      if (alreadyExists) {
        return previous;
      }

      return {
        ...previous,
        items: [createdItem, ...previous.items],
      };
    });
  };

  const handleSaveItem = async (itemData) => {
    setSavingItem(true);
    try {
      if (editingItem?.source === 'sepa') {
        const saved = await sepaPriceMutation.mutateAsync({
          sepa_item_id: editingItem.sepa_item_id || editingItem.id,
          price: itemData.price,
          category_id: itemData.category_id,
        });
        updateItemsCache(saved);
        toast.success(TOAST_MESSAGES.items.sepaPriceUpdated);
      } else if (editingItem) {
        const saved = await itemMutation.mutateAsync({ ...itemData, id: editingItem.id });
        updateItemsCache(saved);
        toast.success(TOAST_MESSAGES.items.updated);
      } else {
        const createdItem = await itemMutation.mutateAsync(itemData);
        appendCreatedItemToItemsCache(createdItem);
        if (page !== 1) {
          setPage(1);
        }
        toast.success(TOAST_MESSAGES.items.created);
      }

      await queryClient.invalidateQueries({ queryKey: ['items', businessId] } as any);
      setShowEditorModal(false);
      setEditingItem(null);
    } catch (error) {
      toast.error(TOAST_MESSAGES.items.saveError);
    } finally {
      setSavingItem(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowEditorModal(true);
  };



  const handleDeleteItem = async (item) => {
    if (!item?.id || item?.source === 'sepa') {
      return;
    }

    const confirmed = window.confirm(`¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteItemMutation.mutateAsync(item.id);
      queryClient.invalidateQueries({ queryKey: ['items', businessId] });
      toast.success(TOAST_MESSAGES.items.deleted);
      setShowEditorModal(false);
      setEditingItem(null);
      setSelectedItems((prev) => prev.filter((key) => key !== getItemSelectionKey(item)));
    } catch (error) {
      toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.items.deleteError));
    }
  };

  const handleSelectItem = (item, checked) => {
    const key = getItemSelectionKey(item);
    if (checked) {
      setSelectedItems(prev => prev.includes(key) ? prev : [...prev, key]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== key));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(items.map((item) => getItemSelectionKey(item)));
    } else {
      setSelectedItems([]);
    }
  };

  const handleAssignCategory = async (categoryId) => {
    setBulkLoading(true);
    try {
      const response = await bulkMutation.mutateAsync({
        targets: buildBulkTargets(),
        operation: 'set_category',
        category_id: categoryId && categoryId !== 'none' ? Number(categoryId) : null
      });
      queryClient.invalidateQueries({ queryKey: ['items', businessId] });
      setSelectedItems([]);
      const updatedCount = response?.updated_count || selectedItems.length;
      toast.success(TOAST_MESSAGES.items.categoryAssignSuccess(updatedCount));
    } catch (error) {
      toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.items.categoryAssignError));
    } finally {
      setBulkLoading(false);
    }
  };


  const handleSetFixedPrice = async (value) => {
    setBulkLoading(true);
    try {
      const response = await bulkMutation.mutateAsync({
        targets: buildBulkTargets(),
        operation: 'set_price',
        price: value
      });
      queryClient.invalidateQueries({ queryKey: ['items', businessId] });
      setSelectedItems([]);
      const updatedCount = response?.updated_count || selectedItems.length;
      toast.success(TOAST_MESSAGES.items.priceUpdated(updatedCount));
    } catch (error) {
      toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.items.setPriceError));
    } finally {
      setBulkLoading(false);
    }
  };

  const handleApplyPriceIncrease = async (percent) => {
    setBulkLoading(true);
    try {
      const response = await bulkMutation.mutateAsync({
        targets: buildBulkTargets(),
        operation: 'adjust_price',
        price_delta: percent
      });
      queryClient.invalidateQueries({ queryKey: ['items', businessId] });
      setSelectedItems([]);
      const updatedCount = response?.updated_count || selectedItems.length;
      toast.success(TOAST_MESSAGES.items.increasePriceSuccess(percent, updatedCount));
    } catch (error) {
      toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.items.updatePricesError));
    } finally {
      setBulkLoading(false);
    }
  };

  const handleImportPreview = async (file) => {
    setImportLoading(true);
    try {
      const previewPayload = await importPreviewMutation.mutateAsync(file);
      const parsingErrors = previewPayload?.parsing_errors || [];
      if (parsingErrors.length > 0) {
        toast.warning(TOAST_MESSAGES.items.csvPreviewWarning(parsingErrors.length));
      }
      setImportFile(file);
      setImportPreviewData(previewPayload);
    } catch (error) {
      toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.items.previewImportError));
    } finally {
      setImportLoading(false);
    }
  };

  const fetchAllPreviewRows = async () => {
    if (!importFile) {
      return [];
    }

    const perPage = 500;
    let currentPage = 1;
    let lastPage = 1;
    const rows = [];

    const previewId = importPreviewData?.preview_id || null;

    do {
      const payload = await importPreviewPageMutation.mutateAsync({
        file: currentPage === 1 && !previewId ? importFile : null,
        previewId,
        page: currentPage,
        perPage
      } as any);
      const pageRows = payload?.rows || [];
      const pagination = payload?.pagination || {};

      rows.push(...pageRows);
      lastPage = Number(pagination.last_page || 1);
      currentPage += 1;
    } while (currentPage <= lastPage);

    return rows;
  };

  const handleImportConfirm = async (mapping: any, categoryId: any, options: any = {}) => {
    const useListPriceAsPrice = Boolean(options?.useListPriceAsPrice);
    setImportLoading(true);
    try {
      const rows = await fetchAllPreviewRows();
      const items = rows.map((row) => {
        const rawPrice = mapping.price ? parseFloat(row[mapping.price]) : undefined;
        const rawListPrice = mapping.list_price ? parseFloat(row[mapping.list_price]) : undefined;
        const parsedPrice = typeof rawPrice === 'number' && !Number.isNaN(rawPrice) ? rawPrice : undefined;
        const parsedListPrice = typeof rawListPrice === 'number' && !Number.isNaN(rawListPrice) ? rawListPrice : undefined;

        return {
          name: mapping.name ? row[mapping.name] : undefined,
          price: parsedPrice ?? ((useListPriceAsPrice && parsedListPrice !== undefined) ? parsedListPrice : undefined),
          sku: mapping.sku ? row[mapping.sku] : undefined,
          barcode: mapping.barcode ? row[mapping.barcode] : undefined,
          category: mapping.category ? row[mapping.category] : undefined,
          stock_quantity: mapping.stock_quantity ? parseFloat(row[mapping.stock_quantity]) : undefined,
          presentation_quantity: mapping.presentation_quantity ? parseFloat(row[mapping.presentation_quantity]) : undefined,
          presentation_unit: mapping.presentation_unit ? row[mapping.presentation_unit] : undefined,
          brand: mapping.brand ? row[mapping.brand] : undefined,
          list_price: parsedListPrice,
        };
      }).filter((item) => item.name && typeof item.price === 'number' && !Number.isNaN(item.price));

      const response = await importConfirmMutation.mutateAsync({
        items,
        category_id: categoryId,
        sync_by_sku: true,
        sync_by_barcode: true
      });
      queryClient.invalidateQueries({ queryKey: ['items', businessId] });
      const importedCount = response?.imported_count
        || response?.count
        || response?.items?.length
        || importPreviewData?.total_rows;
      const createdCount = response?.created_count ?? 0;
      const updatedCount = response?.updated_count ?? 0;
      toast.success(TOAST_MESSAGES.items.importSuccess(importedCount, createdCount, updatedCount));
      setShowImportWizard(false);
      setImportPreviewData(null);
      setImportFile(null);
    } catch (error) {
      toast.error(mapApiErrorMessage(error, TOAST_MESSAGES.items.importError));
    } finally {
      setImportLoading(false);
    }
  };

  const handleApplyCatalogFilters = ({ category, source, onlyPriceUpdated: priceUpdated }: any) => {
    if (category === 'all' || category === 'uncategorized') {
      setCategoryFilter(category);
    } else {
      setCategoryFilter(Number(category) as any);
    }

    setSourceFilter(source);
    setOnlyPriceUpdated(Boolean(priceUpdated));
  };

  const handleClearCatalogFilters = () => {
    setCategoryFilter('all');
    setSourceFilter('all');
    setOnlyPriceUpdated(false);
  };

  const focusAndHighlightBarcodeInput = () => {
    barcodeInputRef.current?.focus();
    setBarcodeInputHighlighted(true);
  };

  useEffect(() => {
    if (!barcodeInputHighlighted) {
      return;
    }

    const timeout = window.setTimeout(() => setBarcodeInputHighlighted(false), 800);
    return () => window.clearTimeout(timeout);
  }, [barcodeInputHighlighted]);

  useKeyboardScanner({
    enabled: scannerEnabled,
    contextId: 'Items',
    contextAllowlist: ['POS', 'Items'],
    contextBlocklist: ['POS_PAYMENT_DIALOG'],
    debug: true,
    onScanComplete: (rawCode) => {
      handleItemsScanComplete({
        rawCode,
        items,
        setPendingScannedCode,
        hasOffsetPagination,
        currentPage,
        setBarcodeOrSkuQuery,
        setSearchQuery,
        setPage,
        focusAndHighlightBarcodeInput,
        invalidateItems: () => {
          queryClient.invalidateQueries({ queryKey: ['items', businessId] });
        },
      });
    },
  });

  useEffect(() => {
    handlePendingItemsScanResolution({
      pendingScannedCode,
      items,
      setPendingScannedCode,
      onNoMatchFound: autoOpenCreateOnUnknownBarcodeEnabled
        ? (code: string) => {
            setBarcodeOrSkuQuery(code);
            setEditingItem(null);
            setShowEditorModal(true);
          }
        : undefined,
    });
  }, [autoOpenCreateOnUnknownBarcodeEnabled, items, pendingScannedCode, setBarcodeOrSkuQuery]);

  return (
    <>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Items</h1>
            <p className="text-slate-500">Administrá tus productos y servicios</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportWizard(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button onClick={() => { setEditingItem(null); setShowEditorModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Item
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <ItemsFiltersDialog
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            barcodeOrSkuValue={barcodeOrSkuQuery}
            onBarcodeOrSkuChange={setBarcodeOrSkuQuery}
            categoryValue={String(categoryFilter)}
            onCategoryChange={setCategoryFilter}
            sourceValue={sourceFilter}
            onSourceChange={setSourceFilter}
            onlyPriceUpdated={onlyPriceUpdated}
            onOnlyPriceUpdatedChange={setOnlyPriceUpdated}
            onApplyFilters={handleApplyCatalogFilters}
            onClearFilters={handleClearCatalogFilters}
            categories={categories}
            searchInputClassName="flex-1 min-w-[240px]"
            barcodeInputClassName="sm:w-44 md:w-52"
            inputClassName={barcodeInputHighlighted ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}
            searchInputRef={null as any}
            barcodeInputRef={barcodeInputRef}
          />
        </div>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="mb-4">
            <BulkActionsBar
              selectedCount={selectedItems.length}
              onClear={() => setSelectedItems([])}
              categories={categories}
              onAssignCategory={handleAssignCategory}
              onApplyPriceIncrease={handleApplyPriceIncrease}
              onSetFixedPrice={handleSetFixedPrice}
              loading={bulkLoading}
            />
          </div>
        )}

        {/* Table */}
        <div className="relative bg-white rounded-xl border border-slate-200 overflow-hidden">
          {showItemsOverlay && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/60">
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
              </div>
            </div>
          )}
          {loadingItems ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Package className="w-12 h-12 mb-3" />
              <p className="text-lg font-medium">No se encontraron items</p>
            </div>
          ) : (
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 px-4">
                      <Checkbox 
                        checked={selectedItems.length === items.length && items.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="px-4">Item</TableHead>
                    <TableHead className="px-4">Categoría</TableHead>
                    <TableHead className="px-4">Marca</TableHead>
                    <TableHead className="px-4">Presentación</TableHead>
                    <TableHead className="px-4 text-right">Precio</TableHead>
                    <TableHead className="px-4 text-center">Stock</TableHead>
                    <TableHead className="px-4">Origen</TableHead>
                    <TableHead className="w-12 px-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <ItemRow
                      key={`${item.source}-${item.id}`}
                      item={item}
                      categories={categories}
                      selected={selectedItems.includes(getItemSelectionKey(item))}
                      onSelect={(checked) => handleSelectItem(item, checked)}
                      onEdit={handleEditItem}
                      showCheckbox
                    />
                  ))}
                </TableBody>
              </Table>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              {hasKnownTotal
                ? `Mostrando ${totalLoaded} de ${totalAvailable} ítems`
                : `Mostrando ${totalLoaded} ítems`}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(Math.max(1, currentPage - 1))}>Anterior</Button>
              <span className="text-sm text-slate-600">
                {hasOffsetPagination ? `Página ${currentPage} de ${totalPages}` : `Página ${currentPage}`}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={hasOffsetPagination ? currentPage >= totalPages : !hasNextCursor}
                onClick={() => setPage(hasOffsetPagination ? Math.min(totalPages, currentPage + 1) : currentPage + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ItemEditorModal
        open={showEditorModal}
        onClose={() => { setShowEditorModal(false); setEditingItem(null); }}
        item={editingItem}
        initialBarcode={!editingItem ? barcodeOrSkuQuery : ''}
        categories={categories}
        onSave={handleSaveItem}
        loading={savingItem}
        onDelete={handleDeleteItem}
      />

      <CsvImportWizard
        open={showImportWizard}
        onClose={() => { setShowImportWizard(false); setImportPreviewData(null); setImportFile(null); }}
        onPreview={handleImportPreview}
        onConfirm={handleImportConfirm}
        categories={categories}
        previewData={importPreviewData}
        loading={importLoading}
      />
    </>
  );
}
