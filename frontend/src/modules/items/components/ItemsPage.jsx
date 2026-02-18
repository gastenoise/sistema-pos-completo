import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Upload, Package, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import {
  useBulkItemsMutation,
  useConfirmItemsImportMutation,
  useItemCategoriesQuery,
  useItemsQuery,
  usePreviewItemsImportMutation,
  usePreviewItemsImportPageMutation,
  useSaveItemMutation,
  useSaveSepaPriceMutation,
  useToggleItemStatusMutation
} from '@/modules/items/hooks/useItemsData';

import { useBusiness } from '@/components/pos/BusinessContext';
import { useAuth } from '@/lib/AuthContext';
import TopNav from '@/components/pos/TopNav';
import ItemRow from '@/components/pos/ItemRow';
import ItemEditorModal from '@/components/pos/ItemEditorModal';
import BulkActionsBar from '@/components/pos/BulkActionsBar';
import CsvImportWizard from '@/components/pos/CsvImportWizard';

export default function Items() {
  const { businessId } = useBusiness();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [barcodeFilter, setBarcodeFilter] = useState('');
  const [onlySepaPriceOverridden, setOnlySepaPriceOverridden] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const updateItemsCache = (entity) => {
    if (!entity?.id) return false;
    queryClient.setQueriesData({ queryKey: ['items', businessId] }, (prev) => {
      if (!prev || !Array.isArray(prev.pages)) {
        return prev;
      }

      let updated = false;
      const pages = prev.pages.map((pageData) => {
        if (!Array.isArray(pageData?.items)) return pageData;
        const found = pageData.items.some((item) => item.id === entity.id && item.source === (entity.source || 'local'));
        if (!found) return pageData;
        updated = true;
        return {
          ...pageData,
          items: pageData.items.map((item) => (item.id === entity.id && item.source === (entity.source || 'local') ? { ...item, ...entity } : item))
        };
      });

      return updated ? { ...prev, pages } : prev;
    });
    return true;
  };

  // Fetch items
  const {
    data: itemsResponse,
    isLoading: loadingItems,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useItemsQuery({
    businessId,
    searchQuery,
    barcode: barcodeFilter,
    categoryFilter,
    source: sourceFilter,
    onlySepaPriceOverridden,
  });

  // Fetch categories
  const { data: categories = [] } = useItemCategoriesQuery(businessId);

  const pages = itemsResponse?.pages || [];
  const items = pages.flatMap((pageData) => pageData?.items || []);
  const pagination = pages[pages.length - 1]?.pagination;
  const totalLoaded = items.length;
  const totalAvailable = pagination?.total ?? totalLoaded;

  // Create/Update mutation
  const itemMutation = useSaveItemMutation();
  const sepaPriceMutation = useSaveSepaPriceMutation();
  const toggleStatusMutation = useToggleItemStatusMutation();
  const bulkMutation = useBulkItemsMutation();
  const importPreviewMutation = usePreviewItemsImportMutation();
  const importPreviewPageMutation = usePreviewItemsImportPageMutation();
  const importConfirmMutation = useConfirmItemsImportMutation();

  const handleSaveItem = async (itemData) => {
    setSavingItem(true);
    try {
      if (editingItem?.source === 'sepa') {
        const saved = await sepaPriceMutation.mutateAsync({
          sepa_item_id: editingItem.sepa_item_id || editingItem.id,
          price: itemData.price,
        });
        updateItemsCache(saved);
        toast.success('Precio SEPA actualizado');
      } else if (editingItem) {
        const saved = await itemMutation.mutateAsync({ ...itemData, id: editingItem.id });
        updateItemsCache(saved);
        toast.success('Item updated');
      } else {
        const saved = await itemMutation.mutateAsync(itemData);
        updateItemsCache(saved);
        toast.success('Item created');
      }
      setShowEditorModal(false);
      setEditingItem(null);
    } catch (error) {
      toast.error('Failed to save item');
    } finally {
      setSavingItem(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowEditorModal(true);
  };

  const handleDeactivateItem = async (item) => {
    try {
      const updated = await toggleStatusMutation.mutateAsync(item);
      if (!updateItemsCache(updated)) {
        queryClient.invalidateQueries({ queryKey: ['items', businessId] });
      }
      toast.success(`Item ${item.is_active ? 'deactivated' : 'activated'}`);
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleSelectItem = (itemId, checked) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(items.filter((item) => item.source !== 'sepa').map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleAssignCategory = async (categoryId) => {
    setBulkLoading(true);
    try {
      const response = await bulkMutation.mutateAsync({
        ids: selectedItems,
        operation: 'set_category',
        category_id: categoryId || null
      });
      queryClient.invalidateQueries({ queryKey: ['items', businessId] });
      setSelectedItems([]);
      const updatedCount = response?.data?.updated_count || selectedItems.length;
      toast.success(`Category assigned to ${updatedCount} items`);
    } catch (error) {
      toast.error(error?.message || 'Failed to assign category');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleApplyPriceIncrease = async (percent) => {
    setBulkLoading(true);
    try {
      const response = await bulkMutation.mutateAsync({
        ids: selectedItems,
        operation: 'adjust_price',
        price_delta: percent
      });
      queryClient.invalidateQueries({ queryKey: ['items', businessId] });
      setSelectedItems([]);
      const updatedCount = response?.data?.updated_count || selectedItems.length;
      toast.success(`Price increased by ${percent}% for ${updatedCount} items`);
    } catch (error) {
      toast.error(error?.message || 'Failed to update prices');
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
        toast.warning(`CSV preview generated with ${parsingErrors.length} parsing errors`);
      }
      setImportFile(file);
      setImportPreviewData(previewPayload);
    } catch (error) {
      toast.error('Failed to preview import');
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
      });
      const pageRows = payload?.rows || [];
      const pagination = payload?.pagination || {};

      rows.push(...pageRows);
      lastPage = Number(pagination.last_page || 1);
      currentPage += 1;
    } while (currentPage <= lastPage);

    return rows;
  };

  const handleImportConfirm = async (mapping, categoryId, options = {}) => {
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
          cost: mapping.cost ? parseFloat(row[mapping.cost]) : undefined,
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
      const importedCount = response?.data?.imported_count
        || response?.imported_count
        || response?.count
        || response?.items?.length
        || importPreviewData?.total_rows;
      const createdCount = response?.data?.created_count ?? response?.created_count ?? 0;
      const updatedCount = response?.data?.updated_count ?? response?.updated_count ?? 0;
      toast.success(`Imported ${importedCount || 0} items (created: ${createdCount}, updated: ${updatedCount})`);
      setShowImportWizard(false);
      setImportPreviewData(null);
      setImportFile(null);
    } catch (error) {
      toast.error('Failed to import items');
    } finally {
      setImportLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav user={user} onLogout={handleLogout} currentPage="Items" />
      
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, código de barras o SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              placeholder="Barcode"
              value={barcodeFilter}
              onChange={(e) => setBarcodeFilter(e.target.value)}
              className="sm:w-44"
            />
            <Select
              value={String(categoryFilter)}
              onValueChange={(v) => {
                if (v === 'all') {
                  setCategoryFilter('all');
                } else if (v === 'uncategorized') {
                  setCategoryFilter('uncategorized');
                } else {
                  setCategoryFilter(Number(v));
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Categorías</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                ))}
                <SelectItem value="uncategorized">Sin Categoría</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="local">Locales</SelectItem>
                <SelectItem value="sepa">SEPA</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox
                checked={onlySepaPriceOverridden}
                onCheckedChange={(checked) => setOnlySepaPriceOverridden(Boolean(checked))}
              />
              Solo SEPA con precio override
            </label>
          </div>
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
              loading={bulkLoading}
            />
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedItems.length === items.length && items.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <ItemRow
                      key={`${item.source}-${item.id}`}
                      item={item}
                      categories={categories}
                      selected={selectedItems.includes(item.id)}
                      onSelect={(checked) => handleSelectItem(item.id, checked)}
                      onEdit={handleEditItem}
                      onDeactivate={handleDeactivateItem}
                      showCheckbox={item.source !== 'sepa'}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Mostrando {totalLoaded} de {totalAvailable} ítems
            </p>
            {hasNextPage && (
              <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ItemEditorModal
        open={showEditorModal}
        onClose={() => { setShowEditorModal(false); setEditingItem(null); }}
        item={editingItem}
        categories={categories}
        onSave={handleSaveItem}
        loading={savingItem}
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
    </div>
  );
}
