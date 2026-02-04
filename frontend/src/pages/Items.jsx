import React, { useState } from 'react';
import { apiClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

import { useBusiness } from '../components/pos/BusinessContext';
import { useAuth } from '../lib/AuthContext';
import TopNav from '../components/pos/TopNav';
import ItemRow from '../components/pos/ItemRow';
import ItemEditorModal from '../components/pos/ItemEditorModal';
import BulkActionsBar from '../components/pos/BulkActionsBar';
import CsvImportWizard from '../components/pos/CsvImportWizard';

const ITEMS_PER_PAGE = 20;

export default function Items() {
  const { businessId } = useBusiness();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const normalizeList = (response, fallbackKey) => {
    if (Array.isArray(response)) return response;
    if (!response || typeof response !== 'object') return [];
    const candidate = response?.[fallbackKey]
      ?? response?.data?.[fallbackKey]
      ?? response?.data
      ?? response?.items
      ?? response?.results;
    return Array.isArray(candidate) ? candidate : [];
  };

  // Fetch items
  const { data: allItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['items', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/items');
      return normalizeList(response, 'items');
    },
    enabled: !!businessId
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/categories');
      const list = normalizeList(response, 'categories');
      return list.filter((category) => category.is_active !== false);
    },
    enabled: !!businessId
  });

  // Filter and paginate items
  const filteredItems = allItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Create/Update mutation
  const itemMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        const { id, ...payload } = data;
        return apiClient.put(`/protected/items/${id}`, payload);
      }
      return apiClient.post('/protected/items', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['items', businessId]);
    }
  });

  const handleSaveItem = async (itemData) => {
    setSavingItem(true);
    try {
      if (editingItem) {
        await itemMutation.mutateAsync({ ...itemData, id: editingItem.id });
        toast.success('Item updated');
      } else {
        await itemMutation.mutateAsync(itemData);
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
      await apiClient.put(`/protected/items/${item.id}`, { is_active: !item.is_active });
      queryClient.invalidateQueries(['items', businessId]);
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
      setSelectedItems(paginatedItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleAssignCategory = async (categoryId) => {
    setBulkLoading(true);
    try {
      for (const itemId of selectedItems) {
        await apiClient.put(`/protected/items/${itemId}`, { category_id: categoryId || null });
      }
      queryClient.invalidateQueries(['items', businessId]);
      setSelectedItems([]);
      toast.success(`Category assigned to ${selectedItems.length} items`);
    } catch (error) {
      toast.error('Failed to assign category');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleApplyPriceIncrease = async (percent) => {
    setBulkLoading(true);
    try {
      const selectedItemsData = allItems.filter(item => selectedItems.includes(item.id));
      for (const item of selectedItemsData) {
        const newPrice = item.price * (1 + percent / 100);
        await apiClient.put(`/protected/items/${item.id}`, { price: Math.round(newPrice * 100) / 100 });
      }
      queryClient.invalidateQueries(['items', businessId]);
      setSelectedItems([]);
      toast.success(`Price increased by ${percent}% for ${selectedItems.length} items`);
    } catch (error) {
      toast.error('Failed to update prices');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleImportPreview = async (file) => {
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/protected/items-import/preview', formData);
      setImportPreviewData(response?.preview || response);
    } catch (error) {
      toast.error('Failed to preview import');
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportConfirm = async (mapping) => {
    setImportLoading(true);
    try {
      const rows = importPreviewData?.rows || importPreviewData?.data?.rows || [];
      const items = rows.map((row) => ({
        name: mapping.name ? row[mapping.name] : undefined,
        price: mapping.price ? parseFloat(row[mapping.price]) : undefined,
        sku: mapping.sku ? row[mapping.sku] : undefined,
        barcode: mapping.barcode ? row[mapping.barcode] : undefined,
        type: mapping.type ? row[mapping.type] : undefined,
        category: mapping.category ? row[mapping.category] : undefined,
        cost: mapping.cost ? parseFloat(row[mapping.cost]) : undefined,
        stock_quantity: mapping.stock_quantity ? parseFloat(row[mapping.stock_quantity]) : undefined
      })).filter((item) => item.name && typeof item.price === 'number' && !Number.isNaN(item.price));

      const response = await apiClient.post('/protected/items-import/confirm', {
        items,
        sync_by_sku: false
      });
      queryClient.invalidateQueries(['items', businessId]);
      const importedCount = response?.imported_count
        || response?.count
        || response?.items?.length
        || importPreviewData?.total_rows;
      toast.success(`Imported ${importedCount || 0} items`);
      setShowImportWizard(false);
      setImportPreviewData(null);
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
            <p className="text-slate-500">Manage your products and services</p>
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
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="fee">Fee</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
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
          ) : paginatedItems.length === 0 ? (
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
                        checked={selectedItems.length === paginatedItems.length && paginatedItems.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
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
                Showing {(page - 1) * ITEMS_PER_PAGE + 1} - {Math.min(page * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length}
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
        onClose={() => { setShowImportWizard(false); setImportPreviewData(null); }}
        onPreview={handleImportPreview}
        onConfirm={handleImportConfirm}
        previewData={importPreviewData}
        loading={importLoading}
      />
    </div>
  );
}
