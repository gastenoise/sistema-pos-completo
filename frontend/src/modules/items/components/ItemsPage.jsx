import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Upload, Package, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  useToggleItemStatusMutation,
  ITEMS_PER_PAGE,
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
  const [page, setPage] = useState(1);
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
      if (!prev || !Array.isArray(prev.items)) {
        return prev;
      }
      const exists = prev.items.find((item) => item.id === entity.id);
      const updatedItems = exists
        ? prev.items.map((item) => (item.id === entity.id ? { ...item, ...entity } : item))
        : [entity, ...prev.items];
      return {
        ...prev,
        items: updatedItems
      };
    });
    return true;
  };

  // Fetch items
  const { data: itemsResponse = { items: [], pagination: null }, isLoading: loadingItems } = useItemsQuery({
    businessId,
    searchQuery,
    categoryFilter,
    page
  });

  // Fetch categories
  const { data: categories = [] } = useItemCategoriesQuery(businessId);

  const items = itemsResponse?.items ?? [];
  const pagination = itemsResponse?.pagination;
  const totalPages = pagination?.last_page ?? Math.ceil(items.length / ITEMS_PER_PAGE);

  // Create/Update mutation
  const itemMutation = useSaveItemMutation();
  const toggleStatusMutation = useToggleItemStatusMutation();
  const bulkMutation = useBulkItemsMutation();
  const importPreviewMutation = usePreviewItemsImportMutation();
  const importPreviewPageMutation = usePreviewItemsImportPageMutation();
  const importConfirmMutation = useConfirmItemsImportMutation();

  const handleSaveItem = async (itemData) => {
    setSavingItem(true);
    try {
      if (editingItem) {
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
      setSelectedItems(items.map(item => item.id));
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

    do {
      const payload = await importPreviewPageMutation.mutateAsync({ file: importFile, page: currentPage, perPage });
      const pageRows = payload?.rows || [];
      const pagination = payload?.pagination || {};

      rows.push(...pageRows);
      lastPage = Number(pagination.last_page || 1);
      currentPage += 1;
    } while (currentPage <= lastPage);

    return rows;
  };

  const handleImportConfirm = async (mapping) => {
    setImportLoading(true);
    try {
      const rows = await fetchAllPreviewRows();
      const items = rows.map((row) => ({
        name: mapping.name ? row[mapping.name] : undefined,
        price: mapping.price ? parseFloat(row[mapping.price]) : undefined,
        sku: mapping.sku ? row[mapping.sku] : undefined,
        barcode: mapping.barcode ? row[mapping.barcode] : undefined,
        category: mapping.category ? row[mapping.category] : undefined,
        cost: mapping.cost ? parseFloat(row[mapping.cost]) : undefined,
        stock_quantity: mapping.stock_quantity ? parseFloat(row[mapping.stock_quantity]) : undefined,
        presentation_quantity: mapping.presentation_quantity ? parseFloat(row[mapping.presentation_quantity]) : undefined,
        presentation_unit: mapping.presentation_unit ? row[mapping.presentation_unit] : undefined,
        brand: mapping.brand ? row[mapping.brand] : undefined,
        list_price: mapping.list_price ? parseFloat(row[mapping.list_price]) : undefined
      })).filter((item) => item.name && typeof item.price === 'number' && !Number.isNaN(item.price));

      const response = await importConfirmMutation.mutateAsync({
        items,
        sync_by_sku: true,
        sync_by_barcode: true
      });
      queryClient.invalidateQueries({ queryKey: ['items', businessId] });
      const importedCount = response?.data?.imported_count
        || response?.imported_count
        || response?.count
        || response?.items?.length
        || importPreviewData?.total_rows;
      toast.success(`Imported ${importedCount || 0} items`);
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
              Import
            </Button>
            <Button onClick={() => { setEditingItem(null); setShowEditorModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
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
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select
              value={String(categoryFilter)}
              onValueChange={(v) => {
                if (v === 'all') {
                  setCategoryFilter('all');
                } else if (v === 'null') {
                  setCategoryFilter('null');
                } else {
                  setCategoryFilter(Number(v));
                }
                setPage(1);
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
                <SelectItem value="null">Sin Categoría</SelectItem>
              </SelectContent>
            </Select>
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
              <p className="text-lg font-medium">No items found</p>
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
                      key={item.id}
                      item={item}
                      categories={categories}
                      selected={selectedItems.includes(item.id)}
                      onSelect={(checked) => handleSelectItem(item.id, checked)}
                      onEdit={handleEditItem}
                      onDeactivate={handleDeactivateItem}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Showing {pagination?.from ?? (items.length ? (page - 1) * ITEMS_PER_PAGE + 1 : 0)} - {pagination?.to ?? Math.min(page * ITEMS_PER_PAGE, items.length)} of {pagination?.total ?? items.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
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
        previewData={importPreviewData}
        loading={importLoading}
      />
    </div>
  );
}
