import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Package, Loader2, ShoppingBag, Coffee, Search, Clock3,
  Utensils, Shirt, Laptop, Smartphone, Book, Wrench, Home, Car, Heart,
  Gamepad, Pizza, Apple, Cake, Watch, Glasses, Plane, Music,
  Camera, Dumbbell, Paintbrush, Hammer, Scissors, Zap, Star, Gift, Tag, CreditCard, Eye
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/formatPrice';
import { BUSINESS_PARAMETER_IDS, normalizeBusinessParameters } from '@/lib/businessParameters';
import { getIconComponent } from '@/lib/iconCatalog';
import { TOAST_MESSAGES } from '@/lib/toastMessages';
import { useAuthorization } from '@/components/auth/AuthorizationContext';
import { useKeyboardScanner } from '@/components/scanner/useKeyboardScanner';
import { handlePendingPosScanResolution, handlePosScanComplete } from '@/modules/pos/utils/scannerHandlers';
import { loadRecentPosItemKeys, recordRecentPosItem, sortItemsByRecentUsage } from '@/modules/pos/utils/recentPosItems';

import { useBusiness } from '@/components/pos/BusinessContext';
import { useCart, CartProvider } from '@/components/pos/CartContext';
import { useAuth } from '@/lib/AuthContext';
import SaleCart from '@/components/pos/SaleCart';
import PaymentWizard from '@/components/pos/PaymentWizard';
import CashRegisterOpenModal from '@/components/pos/CashRegisterOpenModal';
import QuickAddForm from '@/components/pos/QuickAddForm';
import ItemEditorModal from '@/components/pos/ItemEditorModal';
import NetworkIndicator from '@/components/pos/NetworkIndicator';
import SaleDetailsDialog from '@/components/sales/SaleDetailsDialog';
import TicketActions from '@/components/sales/TicketActions';
import ItemsFiltersDialog from '@/components/items/ItemsFiltersDialog';
import { useItemFilters } from '@/modules/items/hooks/useItemFilters';
import { openCashRegister } from '@/api/cash-register';
import {
  closeSale,
  confirmSalePayment,
  createItem,
  extractSaleId,
  getBankAccount,
  getLatestClosedSale,
  getPosCashRegisterStatus,
  getPosCategories,
  getPosItems,
  getPosPaymentMethods,
  getSaleById,
  startSale
} from '@/modules/pos/api';

function POSContent() {
  const { businessId, currentBusiness, businesses } = useBusiness();
  const { addToCart, cartItems, clearCart, offlineQueue, clearOfflineQueue } = useCart();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const {
    searchQuery,
    setSearchQuery,
    barcodeOrSkuQuery,
    setBarcodeOrSkuQuery,
    sourceFilter,
    setSourceFilter,
    categoryFilter,
    setCategoryFilter,
    onlyPriceUpdated,
    setOnlyPriceUpdated,
  } = useItemFilters();
  const [showWizard, setShowWizard] = useState(false);
  const [showCashOpenModal, setShowCashOpenModal] = useState(false);
  const [isOpeningCashRegister, setIsOpeningCashRegister] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [isLastSaleDialogOpen, setIsLastSaleDialogOpen] = useState(false);
  const [syncedSaleIds, setSyncedSaleIds] = useState([]);
  const [isProcessingItemsAction, setIsProcessingItemsAction] = useState(false);
  const [pendingScannedCode, setPendingScannedCode] = useState<string | null>(null);
  const [showScanItemEditorModal, setShowScanItemEditorModal] = useState(false);
  const [pendingBarcodeForCreate, setPendingBarcodeForCreate] = useState('');
  const [recentItemKeysSnapshot, setRecentItemKeysSnapshot] = useState<string[]>([]);
  const { role } = useAuthorization();

  const [mobileShowResults, setMobileShowResults] = useState(false);
  const [mobileSelectedIndex, setMobileSelectedIndex] = useState(0);
  const [mobileSortMode, setMobileSortMode] = useState<'recent' | 'search'>('recent');

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastScannedCodeRef = useRef<{ code: string; scannedAt: number } | null>(null);
  const lastNoMatchResolvedCodeRef = useRef<{ code: string; resolvedAt: number } | null>(null);

  // Fetch items (server-side top-N search)
  const { data: itemsData = [], isLoading: loadingItems, isFetching: fetchingItems } = useQuery({
    queryKey: ['items', businessId, searchQuery, barcodeOrSkuQuery, sourceFilter, categoryFilter, onlyPriceUpdated],
    queryFn: async () => {
      if (!businessId) return [];
      return getPosItems({
        searchQuery,
        barcodeOrSkuQuery,
        sourceFilter,
        categoryFilter,
        onlyPriceUpdated
      });
    },
    enabled: !!businessId
  });
  const items = itemsData as any[];

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      return getPosCategories();
    },
    enabled: !!businessId
  });

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['paymentMethods', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      return getPosPaymentMethods();
    },
    enabled: !!businessId
  });


  const paymentMethodLookup = paymentMethods.reduce((acc, method) => {
    if (method.code) {
      acc[method.code] = method;
    }
    if (method.type) {
      acc[method.type] = method;
    }
    return acc;
  }, {});


  const selectedBusiness = businesses.find((business) => {
    const id = business?.business_id ?? business?.id;
    return String(id) === String(businessId);
  });

  const canVoidSales = role === 'owner' || role === 'admin';

  const currentBusinessParameters: any = {
    ...normalizeBusinessParameters(selectedBusiness),
    ...normalizeBusinessParameters(currentBusiness),
  };

  const shouldAutoOpenLastSale = Boolean(
    currentBusinessParameters[BUSINESS_PARAMETER_IDS.SHOW_CLOSED_SALE_AUTOMATICALLY]
  );
  const scannerEnabledByBusiness = currentBusinessParameters[BUSINESS_PARAMETER_IDS.ENABLE_BARCODE_SCANNER] === true;
  const autoOpenCreateOnUnknownBarcodeEnabled = currentBusinessParameters[BUSINESS_PARAMETER_IDS.AUTO_OPEN_ITEM_CREATE_ON_UNKNOWN_BARCODE] === true;
  const hasPaymentDialogOpen = showWizard || showCashOpenModal;
  const scannerEnabled = scannerEnabledByBusiness;
  const scannerContextId = hasPaymentDialogOpen ? 'POS_PAYMENT_DIALOG' : 'POS';

  const { data: lastCompletedSale = null } = useQuery({
    queryKey: ['latest-closed-sale', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      return getLatestClosedSale();
    },
    enabled: !!businessId
  });

  // Fetch bank account data
  const { data: bankAccountData } = useQuery({
    queryKey: ['bankAccount', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      return getBankAccount();
    },
    enabled: !!businessId
  });

  // Fetch cash register status
  const { data: cashRegisterStatus, refetch: refetchCashStatus } = useQuery({
    queryKey: ['cashRegisterStatus', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      return getPosCashRegisterStatus();
    },
    enabled: !!businessId
  });

  const mapSalePayments = (payments = []) => {
    return payments.map((payment) => {
      const pm = payment.paymentMethod || payment.payment_method;
      return {
        ...payment,
        payment_method_id: payment.payment_method_id,
        payment_method_type: pm?.type || pm?.code,
        method: pm || paymentMethods.find((method) => String(method.id) === String(payment.payment_method_id))
      };
    });
  };

  const startSaleWithItemsAndPayments = async ({ cashRegisterSessionId, items, payments }) => {
    const saleResponse = await startSale({
      cash_register_session_id: cashRegisterSessionId,
      items: items.map((item) => ({
        ...(item.is_quick_item
          ? {
              quick_item_name: item.name,
              quick_item_price: item.unit_price,
              quick_item_category_id: item.category_id ?? null,
            }
          : {
              item_source: item.item_source || 'local',
              item_id: item.item_source === 'local' ? item.item_id : undefined,
              sepa_item_id: item.item_source === 'sepa' ? item.sepa_item_id : undefined,
              catalog_item_id: item.catalog_item_id,
            }),
        quantity: item.quantity,
        unit_price_override: item.unit_price
      })),
      payments: payments.map((payment) => ({
        payment_method_id: payment.payment_method_id,
        amount: payment.amount,
        ...(payment.payment_reference && { transaction_reference: payment.payment_reference })
      }))
    });

    const saleId = extractSaleId(saleResponse);
    if (!saleId) {
      throw new Error('Sale ID missing from response');
    }

    const saleEntity = saleResponse;
    const salePayments = mapSalePayments(saleEntity?.payments || []);

    return { saleId, salePayments };
  };

  const closeSaleFlow = async (saleId) => {
    await closeSale(saleId, {
      notes: 'Venta completada'
    });

    const saleDetail = await getSaleById(saleId);

    return { saleId, saleDetail };
  };

  const createSaleFlow = async ({ sale, items, payments }) => {
    const { saleId, salePayments: createdPayments } = await startSaleWithItemsAndPayments({
      cashRegisterSessionId: sale?.cash_register_session_id,
      items,
      payments,
    });

    await Promise.all(
      createdPayments
        .filter((payment, index) => (payments[index]?.status || 'pending') === 'confirmed')
        .map((payment, index) =>
          confirmSalePayment(saleId, payment.id, {
            ...(payments[index]?.payment_reference && { transaction_reference: payments[index].payment_reference })
          })
        )
    );

    return closeSaleFlow(saleId);
  };

  const normalizeQueuedSale = (queuedSale) => {
    if (queuedSale?.sale && queuedSale?.items && queuedSale?.payments) {
      return queuedSale;
    }

    const saleBase = {
      business_id: queuedSale?.business_id,
      cash_register_session_id: queuedSale?.cash_register_session_id,
      subtotal: queuedSale?.subtotal,
      total: queuedSale?.total,
      status: queuedSale?.status || 'open'
    };

    const payments = queuedSale?.payments
      || (queuedSale?.payment_method_id
        ? [{
            id: queuedSale.payment_method_id,
            payment_method_id: queuedSale.payment_method_id,
            payment_method_type: queuedSale.payment_method_type,
            amount: queuedSale.total || queuedSale.subtotal || 0,
            status: 'confirmed'
          }]
        : []);

    return {
      sale: saleBase,
      items: queuedSale?.items || [],
      payments
    };
  };

  const addScannedItem = (code: string, item: any) => {
    const now = Date.now();
    const lastScan = lastScannedCodeRef.current;
    if (lastScan && lastScan.code === code && now - lastScan.scannedAt < 400) {
      return false;
    }

    lastScannedCodeRef.current = { code, scannedAt: now };
    handleItemClick(item);
    return true;
  };

  const appendCreatedItemToItemsCache = (createdItem: any) => {
    if (!createdItem?.id) {
      return;
    }

    queryClient.setQueriesData({ queryKey: ['items', businessId] }, (previous: any) => {
      if (Array.isArray(previous)) {
        const alreadyExists = previous.some((item: any) => String(item?.id) === String(createdItem.id));
        return alreadyExists ? previous : [createdItem, ...previous];
      }

      if (previous && Array.isArray(previous.items)) {
        const alreadyExists = previous.items.some((item: any) => String(item?.id) === String(createdItem.id));
        if (alreadyExists) {
          return previous;
        }

        return {
          ...previous,
          items: [createdItem, ...previous.items],
        };
      }

      return previous;
    });
  };

  const handleNoMatchFoundAfterRefresh = (code: string) => {
    const now = Date.now();
    const lastNoMatch = lastNoMatchResolvedCodeRef.current;
    if (lastNoMatch && lastNoMatch.code === code && now - lastNoMatch.resolvedAt < 400) {
      return;
    }

    lastNoMatchResolvedCodeRef.current = { code, resolvedAt: now };

    setPendingBarcodeForCreate(code);
    setShowScanItemEditorModal(true);
  };

  useKeyboardScanner({
    enabled: scannerEnabled,
    contextId: scannerContextId,
    contextAllowlist: ['POS', 'Items'],
    contextBlocklist: ['POS_PAYMENT_DIALOG'],
    debug: true,
    onScanComplete: (rawCode) => {
      handlePosScanComplete({
        rawCode,
        hasPaymentDialogOpen,
        items,
        setBarcodeOrSkuQuery,
        setPendingScannedCode,
        addScannedItem,
        invalidateItems: () => {
          queryClient.invalidateQueries({ queryKey: ['items', businessId] });
        },
      });
    },
  });

  useEffect(() => {
    handlePendingPosScanResolution({
      pendingScannedCode,
      items,
      addScannedItem,
      setPendingScannedCode,
      onNoMatchFound: autoOpenCreateOnUnknownBarcodeEnabled ? handleNoMatchFoundAfterRefresh : undefined,
    });
  }, [autoOpenCreateOnUnknownBarcodeEnabled, items, pendingScannedCode]);

  useEffect(() => {
    setRecentItemKeysSnapshot(loadRecentPosItemKeys(businessId, user?.id));
  }, [businessId, user?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Focus search on "/"
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Open payment on "Enter" when cart has items
      if (e.key === 'Enter' && e.ctrlKey && cartItems.length > 0) {
        handleCharge();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems]);

  const handleItemClick = (item) => {
    recordRecentPosItem(businessId, user?.id, item);
    addToCart(item);
    toast.success(TOAST_MESSAGES.pos.itemAdded(item.name));
  };

  const handleCharge = () => {
    if (cartItems.length === 0) {
      toast.error(TOAST_MESSAGES.pos.cartEmpty);
      return;
    }

    if (cashRegisterStatus?.status === 'closed') {
      setPendingPayment({ requestedAt: Date.now() });
      setShowCashOpenModal(true);
      return;
    }

    setShowWizard(true);
  };

  const handleOpenCashRegister = async (openingAmount) => {
    setIsOpeningCashRegister(true);
    try {
      await openCashRegister(openingAmount);
      await refetchCashStatus();

      const shouldContinuePayment = Boolean(pendingPayment);
      setShowCashOpenModal(false);
      setPendingPayment(null);
      toast.success(TOAST_MESSAGES.cashRegister.openSuccess);

      if (shouldContinuePayment) {
        setShowWizard(true);
      }
    } catch (error) {
      toast.error(TOAST_MESSAGES.cashRegister.openError);
    } finally {
      setIsOpeningCashRegister(false);
    }
  };

  const handleInitializeSale = async (paymentsDraft) => {
    const { saleId, salePayments } = await startSaleWithItemsAndPayments({
      cashRegisterSessionId: cashRegisterStatus?.id,
      items: cartItems,
      payments: paymentsDraft.map((payment) => ({
        payment_method_id: payment.method.id,
        amount: payment.amount,
      }))
    });

    return {
      saleId,
      payments: salePayments,
    };
  };

  const handleConfirmPayment = async ({ saleId, paymentId, status, reference }) => {
    if (status !== 'confirmed') {
      return null;
    }

    const confirmed = await confirmSalePayment(saleId, paymentId, {
      ...(reference && { transaction_reference: reference })
    });

    const pm = confirmed?.paymentMethod || confirmed?.payment_method;

    return {
      ...confirmed,
      method: pm || paymentMethods.find((method) => String(method.id) === String(confirmed?.payment_method_id)),
      payment_method_type: pm?.type || pm?.code,
    };
  };

  const handleWizardComplete = async ({ saleId }) => {
    try {
      const { saleDetail } = await closeSaleFlow(saleId);
      const normalizedSale = saleDetail ? { ...saleDetail, id: saleDetail.id ?? saleId } : { id: saleId };
      queryClient.setQueryData(['latest-closed-sale', businessId], normalizedSale);
      setIsLastSaleDialogOpen(shouldAutoOpenLastSale);
      clearCart();
    } catch (error) {
      if (error.message?.includes('cash') || error.message?.includes('closed')) {
        setPendingPayment({ requestedAt: Date.now() });
        setShowCashOpenModal(true);
        setShowWizard(false);
      } else {
        throw error;
      }
    }
  };

  const handleQuickAdd = async (itemData) => {
    if (itemData.save_to_catalog) {
      await handleSaveItemFromScan(itemData);
      return;
    }

    addToCart({
      id: `quick-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: itemData.name,
      price: Number(itemData.price),
      barcode: itemData.barcode || null,
      category_id: itemData.category_id ?? null,
      is_quick_item: true,
    });
  };

  const handleSaveItemFromScan = async (itemData) => {
    setIsProcessingItemsAction(true);
    try {
      const payload = {
        name: itemData.name,
        price: Number(itemData.price),
        is_active: true,
        ...(itemData.barcode ? { barcode: itemData.barcode } : {}),
        ...(itemData.category_id !== undefined && { category_id: itemData.category_id }),
      };

      const createdItem = await createItem(payload);

      if (!createdItem?.id) {
        throw new Error('No se pudo crear el item en catálogo');
      }

      appendCreatedItemToItemsCache(createdItem);
      addToCart({
        id: createdItem.id,
        source: createdItem.source || 'local',
        name: createdItem.name,
        price: Number(createdItem.price),
        barcode: createdItem.barcode ?? itemData.barcode ?? null,
        category_id: createdItem.category_id ?? itemData.category_id ?? null,
      });

      recordRecentPosItem(businessId, user?.id, {
        id: createdItem.id,
        source: createdItem.source || 'local',
      });

      queryClient.invalidateQueries({ queryKey: ['items', businessId] });
      setShowScanItemEditorModal(false);
      setPendingBarcodeForCreate('');
    } catch (error) {
      toast.error(error?.message || TOAST_MESSAGES.items.saveError);
      throw error;
    } finally {
      setIsProcessingItemsAction(false);
    }
  };

  const handleSyncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    
    let successCount = 0;
    let failCount = 0;
    const syncedIds = [];
    
    for (const queuedSale of offlineQueue) {
      try {
        const normalizedSale = normalizeQueuedSale(queuedSale);
        const { saleId } = await createSaleFlow(normalizedSale);
        if (saleId) {
          syncedIds.push(saleId);
        }
        successCount++;
      } catch (error) {
        failCount++;
      }
    }
    
    clearOfflineQueue();
    
    if (successCount > 0) {
      setSyncedSaleIds(syncedIds);
      toast.success(TOAST_MESSAGES.pos.syncSuccess(successCount));
    }
    if (failCount > 0) {
      toast.error(TOAST_MESSAGES.pos.syncError(failCount));
    }
  };

  const handleApplyCatalogFilters = ({ category, source, onlyPriceUpdated: priceUpdated }) => {
    setCategoryFilter(category);
    setSourceFilter(source);
    setOnlyPriceUpdated(Boolean(priceUpdated));
  };

  const handleClearCatalogFilters = () => {
    setCategoryFilter('all');
    setSourceFilter('all');
    setOnlyPriceUpdated(false);
  };

  const getItemIcon = (item) => {
    const category = categories.find(c => c.id === item.category_id);
    const IconComponent = getIconComponent(category?.icon);
    return { Icon: IconComponent, color: category?.color || '#94a3b8' };
  };

  const showItemsOverlay = !loadingItems && (fetchingItems || isProcessingItemsAction);

  const hasCatalogFiltersApplied = Boolean(
    searchQuery?.trim()
    || barcodeOrSkuQuery?.trim()
    || sourceFilter !== 'all'
    || String(categoryFilter) !== 'all'
    || onlyPriceUpdated
  );

  const filteredItems = hasCatalogFiltersApplied
    ? items
    : sortItemsByRecentUsage(items, recentItemKeysSnapshot);

  const mobileItems = useMemo(() => {
    if (mobileSortMode === 'recent' && !hasCatalogFiltersApplied) {
      return sortItemsByRecentUsage(items, recentItemKeysSnapshot);
    }
    return filteredItems;
  }, [mobileSortMode, hasCatalogFiltersApplied, items, recentItemKeysSnapshot, filteredItems]);

  useEffect(() => {
    setMobileSelectedIndex(0);
  }, [searchQuery, barcodeOrSkuQuery, mobileSortMode]);

  const handleMobileInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mobileShowResults || mobileItems.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMobileSelectedIndex((prev) => Math.min(prev + 1, mobileItems.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setMobileSelectedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const selectedItem = mobileItems[mobileSelectedIndex];
      if (selectedItem) {
        handleItemClick(selectedItem);
        setMobileShowResults(true);
        searchInputRef.current?.focus();
      }
    }
  };

  return (
    <>
      <div className="flex min-h-[calc(100vh-var(--top-nav-height)-var(--status-bar-height)-2.5rem)] flex-col lg:flex-row">
        {/* Items Panel */}
        <div className="flex-1 flex flex-col p-4">
          {/* Search Bar Desktop */}
          <div className="mb-4 hidden lg:block">
            <ItemsFiltersDialog
              searchInputRef={searchInputRef}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              barcodeOrSkuValue={barcodeOrSkuQuery}
              onBarcodeOrSkuChange={setBarcodeOrSkuQuery}
              categoryValue={String(categoryFilter)}
              onCategoryChange={(value) => setCategoryFilter(value)}
              sourceValue={sourceFilter}
              onSourceChange={setSourceFilter}
              onlyPriceUpdated={onlyPriceUpdated}
              onOnlyPriceUpdatedChange={setOnlyPriceUpdated}
              onApplyFilters={handleApplyCatalogFilters}
              onClearFilters={handleClearCatalogFilters}
              categories={categories}
              inputClassName="h-12"
              searchInputClassName="flex-1 min-w-[240px]"
              barcodeInputClassName="sm:w-44 md:w-52"
              rightContent={
                <QuickAddForm
                  onAdd={handleQuickAdd}
                  categories={categories}
                />
              }
            />
          </div>

          <div className="mb-4 space-y-3 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setMobileShowResults(true); }}
                  onFocus={() => setMobileShowResults(true)}
                  onKeyDown={handleMobileInputKeyDown}
                  placeholder="Buscar por nombre"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <QuickAddForm onAdd={handleQuickAdd} categories={categories} />
            </div>
            <ItemsFiltersDialog
              searchInputRef={searchInputRef}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              barcodeOrSkuValue={barcodeOrSkuQuery}
              onBarcodeOrSkuChange={setBarcodeOrSkuQuery}
              categoryValue={String(categoryFilter)}
              onCategoryChange={(value) => setCategoryFilter(value)}
              sourceValue={sourceFilter}
              onSourceChange={setSourceFilter}
              onlyPriceUpdated={onlyPriceUpdated}
              onOnlyPriceUpdatedChange={setOnlyPriceUpdated}
              onApplyFilters={handleApplyCatalogFilters}
              onClearFilters={handleClearCatalogFilters}
              categories={categories}
            />
            <div className="flex gap-2">
              <button type="button" className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${mobileSortMode === 'recent' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`} onClick={() => setMobileSortMode('recent')}><Clock3 className="h-3.5 w-3.5" />Recientes</button>
              <button type="button" className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${mobileSortMode === 'search' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`} onClick={() => setMobileSortMode('search')}><Search className="h-3.5 w-3.5" />Resultados</button>
            </div>
          </div>

          {/* Items Grid */}
          <div className="relative flex-1 overflow-auto">
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
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Package className="w-12 h-12 mb-3" />
                <p className="text-lg font-medium">No se encontraron items</p>
                <p className="text-sm">
                  {searchQuery ? 'Probá con un filtro diferente' : 'Empezá escribiendo para buscar ítems'}
                </p>
              </div>
            ) : (
              <>
              <div className="hidden lg:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map((item) => {
                  const { Icon, color } = getItemIcon(item);
                  return (
                    <button
                      key={`${(item as any).source || 'local'}-${(item as any).id}`}
                      onClick={() => handleItemClick(item)}
                      className="bg-white rounded-xl p-3 text-left hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <div 
                        className="w-full aspect-video rounded-lg mb-2 flex items-center justify-center"
                        style={{ backgroundColor: color + '20' }}
                      >
                        <Icon className="w-7 h-7" style={{ color: color }} />
                      </div>
                      <p className="font-medium text-slate-900 truncate text-sm">{item.name}</p>
                      <p className="text-base font-bold text-blue-600">{formatPrice(item.price, currentBusiness)}</p>
                      {item.barcode && (
                        <p className="text-xs text-slate-400 mt-0.5">CB: {item.barcode}</p>
                      )}
                      {item.sku && (
                        <p className="text-xs text-slate-400 mt-0.5">SKU: {item.sku}</p>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2 lg:hidden">
                {(mobileShowResults ? mobileItems : mobileItems.slice(0, 8)).map((item, index) => (
                  <button
                    key={`${(item as any).source || 'local'}-${(item as any).id}-mobile`}
                    type="button"
                    onClick={() => { handleItemClick(item); setMobileShowResults(true); searchInputRef.current?.focus(); }}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${index === mobileSelectedIndex ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="truncate text-xs text-slate-500">{item.barcode || item.sku ? `${item.barcode ? `CB: ${item.barcode}` : ''}${item.barcode && item.sku ? ' · ' : ''}${item.sku ? `SKU: ${item.sku}` : ''}` : 'Sin código'}</p>
                      </div>
                      <span className="text-sm font-bold text-blue-600">{formatPrice(item.price, currentBusiness)}</span>
                    </div>
                  </button>
                ))}
              </div>
              </>
            )}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="w-full lg:w-[450px] bg-white border-l border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">Esta venta</h2>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 disabled:text-slate-400"
                disabled={!lastCompletedSale?.id}
                onClick={() => setIsLastSaleDialogOpen(true)}
              >
                <Eye className="w-3.5 h-3.5" />
                Venta anterior
              </button>
            </div>
            {cashRegisterStatus?.status === 'closed' && (
              <p className="text-xs text-amber-600 mt-1">La caja está cerrada</p>
            )}
          </div>
          <SaleCart onCharge={handleCharge} />
        </div>
      </div>

      {/* Payment Wizard */}
      <PaymentWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        total={cartItems.reduce((sum, item) => sum + item.subtotal, 0)}
        businessData={currentBusiness}
        bankAccountData={bankAccountData}
        paymentMethods={paymentMethods}
        onInitializeSale={handleInitializeSale}
        onConfirmPayment={handleConfirmPayment}
        onComplete={handleWizardComplete}
      />

      {/* Cash Register Open Modal */}
      <CashRegisterOpenModal
        open={showCashOpenModal}
        onClose={() => {
          if (isOpeningCashRegister) return;
          setShowCashOpenModal(false);
          setPendingPayment(null);
        }}
        onConfirm={handleOpenCashRegister}
        loading={isOpeningCashRegister}
        warningMessage={
          pendingPayment
            ? 'La caja registradora está cerrada, debes abrirla para continuar con el pago.'
            : null
        }
      />

      {/* Network Indicator */}
      {/* <NetworkIndicator onSyncQueue={handleSyncOfflineQueue} /> */}

      <SaleDetailsDialog
        open={isLastSaleDialogOpen && !!lastCompletedSale}
        onOpenChange={setIsLastSaleDialogOpen}
        sale={lastCompletedSale}
        customerEmail={(lastCompletedSale as any)?.customer?.email || ''}
        currentBusiness={currentBusiness}
        paymentMethodLookup={paymentMethodLookup}
        canVoid={canVoidSales}
        onVoided={() => {
          queryClient.setQueryData(['latest-closed-sale', businessId] as any, (prev: any) => (prev ? { ...prev, status: 'voided' } : prev));
        }}
      />

      <Dialog open={syncedSaleIds.length > 0} onOpenChange={(open) => !open && setSyncedSaleIds([])}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tickets de ventas sincronizadas</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            La sincronización finalizó. Revisa cada ticket para descargarlo o compartirlo.
          </p>
          <div className="space-y-4 pt-2 max-h-96 overflow-y-auto">
            {syncedSaleIds.map((saleId) => (
              <div key={saleId} className="border rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-2">Venta #{saleId}</p>
                <TicketActions saleId={saleId} customerEmail="" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ItemEditorModal
        open={showScanItemEditorModal}
        onClose={() => {
          setShowScanItemEditorModal(false);
          setPendingBarcodeForCreate('');
        }}
        item={null}
        initialBarcode={pendingBarcodeForCreate}
        categories={categories}
        onSave={handleSaveItemFromScan}
        loading={isProcessingItemsAction}
      />
    </>
  );
}

export default function POS() {
  return (
    <CartProvider>
      <POSContent />
    </CartProvider>
  );
}
