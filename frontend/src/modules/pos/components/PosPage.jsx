import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Package, Loader2, ShoppingBag, Coffee,
  Utensils, Shirt, Laptop, Smartphone, Book, Wrench, Home, Car, Heart,
  Gamepad, Pizza, Apple, Cake, Watch, Glasses, Plane, Music,
  Camera, Dumbbell, Paintbrush, Hammer, Scissors, Zap, Star, Gift, Tag, CreditCard, Eye
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { normalizeEntityResponse, normalizeListResponse } from '@/lib/normalizeResponse';
import { mapCatalogIsActive } from '@/lib/catalogNaming';
import { formatPrice } from '@/lib/formatPrice';
import { BUSINESS_PARAMETER_IDS, normalizeBusinessParameters } from '@/lib/businessParameters';
import { getIconComponent } from '@/lib/iconCatalog';

import { useBusiness } from '@/components/pos/BusinessContext';
import { useCart, CartProvider } from '@/components/pos/CartContext';
import { useAuth } from '@/lib/AuthContext';
import TopNav from '@/components/pos/TopNav';
import SaleCart from '@/components/pos/SaleCart';
import PaymentWizard from '@/components/pos/PaymentWizard';
import CashRegisterOpenModal from '@/components/pos/CashRegisterOpenModal';
import QuickAddForm from '@/components/pos/QuickAddForm';
import NetworkIndicator from '@/components/pos/NetworkIndicator';
import SaleDetailsDialog from '@/components/sales/SaleDetailsDialog';
import TicketActions from '@/components/sales/TicketActions';

function POSContent() {
  const { businessId, currentBusiness, businesses } = useBusiness();
  const { addToCart, cartItems, clearCart, offlineQueue, clearOfflineQueue } = useCart();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showWizard, setShowWizard] = useState(false);
  const [showCashOpenModal, setShowCashOpenModal] = useState(false);
  const [isOpeningCashRegister, setIsOpeningCashRegister] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [isLastSaleDialogOpen, setIsLastSaleDialogOpen] = useState(false);
  const [syncedSaleIds, setSyncedSaleIds] = useState([]);
  
  const searchInputRef = useRef(null);

  // Fetch items (server-side top-N search)
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['items', businessId, searchQuery, sourceFilter, categoryFilter],
    queryFn: async () => {
      if (!businessId) return [];
      const query = new URLSearchParams();
      query.set('active', 'true');
      query.set('source', sourceFilter);
      query.set('per_page', '24');
      const trimmedSearch = searchQuery.trim();
      if (trimmedSearch) {
        query.set('search', trimmedSearch);
        if (/^\d{4,}$/.test(trimmedSearch)) {
          query.set('barcode', trimmedSearch);
        }
      }
      if (categoryFilter !== 'all') {
        query.set('category', categoryFilter);
      }
      if (!trimmedSearch && sourceFilter === 'all' && categoryFilter === 'all') {
        query.set('recent_first', 'true');
      }

      const response = await apiClient.get(`/protected/items?${query.toString()}`);
      return mapCatalogIsActive(normalizeListResponse(response, 'items'))
        .map((item) => ({
          ...item,
          category_id: item.category_id !== null && item.category_id !== undefined
            ? Number(item.category_id)
            : null
        }))
        .filter((item) => item.is_active !== false);
    },
    enabled: !!businessId
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/categories');
      return mapCatalogIsActive(normalizeListResponse(response, 'categories')).map((category) => ({
        ...category,
        id: Number(category.id)
      }));
    },
    enabled: !!businessId
  });

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['paymentMethods', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/payment-methods');
      const methods = normalizeListResponse(response, 'payment_methods');
      return methods
        .map((method) => ({
          ...method,
          type: method.type || method.code
        }))
        .filter((method) => (method.is_active ?? method.active) !== false);
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

  const currentBusinessRole = currentBusiness?.pivot?.role
    || currentBusiness?.role
    || selectedBusiness?.pivot?.role
    || selectedBusiness?.role
    || null;

  const canVoidSales = currentBusinessRole === 'admin';

  const currentBusinessParameters = {
    ...normalizeBusinessParameters(selectedBusiness),
    ...normalizeBusinessParameters(currentBusiness),
  };

  const shouldAutoOpenLastSale = Boolean(
    currentBusinessParameters[BUSINESS_PARAMETER_IDS.SHOW_CLOSED_SALE_AUTOMATICALLY]
  );

  const { data: lastCompletedSale = null } = useQuery({
    queryKey: ['latest-closed-sale', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const response = await apiClient.get('/protected/sales/latest-closed');
      return normalizeEntityResponse(response);
    },
    enabled: !!businessId
  });

  // Fetch bank account data
  const { data: bankAccountData } = useQuery({
    queryKey: ['bankAccount', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const response = await apiClient.get('/protected/banks');
      return response?.data ?? response;
    },
    enabled: !!businessId
  });

  // Fetch cash register status
  const { data: cashRegisterStatus, refetch: refetchCashStatus } = useQuery({
    queryKey: ['cashRegisterStatus', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const response = await apiClient.get('/protected/cash-register/status');
      const status = response?.status
        || (response?.data?.is_open ? 'open' : 'closed');
      const session = response?.session || response?.data?.session;
      if (status === 'open' && session) {
        return { status, ...session };
      }
      if (status) {
        return { status };
      }
      return response || { status: 'closed' };
    },
    enabled: !!businessId
  });

  const extractSaleId = (response) => {
    return (
      response?.id
      || response?.sale?.id
      || response?.data?.id
      || response?.data?.sale?.id
      || response?.sale_id
      || null
    );
  };

  const mapSalePayments = (payments = []) => {
    return payments.map((payment) => ({
      ...payment,
      payment_method_id: payment.payment_method_id,
      payment_method_type: payment.paymentMethod?.type || payment.paymentMethod?.code,
      method: payment.paymentMethod || paymentMethods.find((method) => String(method.id) === String(payment.payment_method_id))
    }));
  };

  const startSaleWithItemsAndPayments = async ({ cashRegisterSessionId, items, payments }) => {
    const saleResponse = await apiClient.post('/protected/sales/start', {
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

    const saleEntity = normalizeEntityResponse(saleResponse);
    const salePayments = mapSalePayments(saleEntity?.payments || []);

    return { saleId, salePayments };
  };

  const closeSaleFlow = async (saleId) => {
    await apiClient.post(`/protected/sales/${saleId}/close`, {
      notes: 'Venta completada'
    });

    const saleDetailResponse = await apiClient.get(`/protected/sales/${saleId}`);
    const saleDetail = normalizeEntityResponse(saleDetailResponse);

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
          apiClient.post(`/protected/sales/${saleId}/payments/${payment.id}/confirm`, {
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
    addToCart(item);
    toast.success(`Added ${item.name}`);
  };

  const handleCharge = () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
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
      await apiClient.post('/protected/cash-register/open', {
        amount: openingAmount
      });
      await refetchCashStatus();

      const shouldContinuePayment = Boolean(pendingPayment);
      setShowCashOpenModal(false);
      setPendingPayment(null);
      toast.success('Se abrió la caja');

      if (shouldContinuePayment) {
        setShowWizard(true);
      }
    } catch (error) {
      toast.error('Error al abrir la caja');
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

    const response = await apiClient.post(`/protected/sales/${saleId}/payments/${paymentId}/confirm`, {
      ...(reference && { transaction_reference: reference })
    });

    const confirmed = normalizeEntityResponse(response);

    return {
      ...confirmed,
      method: confirmed?.paymentMethod || paymentMethods.find((method) => String(method.id) === String(confirmed?.payment_method_id)),
      payment_method_type: confirmed?.paymentMethod?.type || confirmed?.paymentMethod?.code,
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
      const payload = {
        name: itemData.name,
        price: Number(itemData.price),
        is_active: true,
        ...(itemData.category_id !== undefined && { category_id: itemData.category_id }),
      };

      const createdResponse = await apiClient.post('/protected/items', payload);
      const createdItem = normalizeEntityResponse(createdResponse);

      if (!createdItem?.id) {
        throw new Error('No se pudo crear el item en catálogo');
      }

      addToCart({
        id: createdItem.id,
        name: createdItem.name,
        price: Number(createdItem.price),
        category_id: createdItem.category_id ?? itemData.category_id ?? null,
      });

      queryClient.invalidateQueries({ queryKey: ['items', businessId] });
      return;
    }

    addToCart({
      id: `quick-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: itemData.name,
      price: Number(itemData.price),
      category_id: itemData.category_id ?? null,
      is_quick_item: true,
    });
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
      toast.success(`Synced ${successCount} sale${successCount !== 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to sync ${failCount} sale${failCount !== 1 ? 's' : ''}`);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const getItemIcon = (item) => {
    const category = categories.find(c => c.id === item.category_id);
    const IconComponent = getIconComponent(category?.icon);
    return { Icon: IconComponent, color: category?.color || '#94a3b8' };
  };

  const filteredItems = items;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <TopNav user={user} onLogout={handleLogout} currentPage="POS" />
      
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Items Panel */}
        <div className="flex-1 flex flex-col p-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por nombre, código de barras o SKU... (/)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[170px] h-12">
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="local">Locales</SelectItem>
                <SelectItem value="sepa">SEPA</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] h-12">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorías</SelectItem>
                <SelectItem value="uncategorized">Sin categoría</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <QuickAddForm onAdd={handleQuickAdd} categories={categories} />
          </div>

          {/* Items Grid */}
          <div className="flex-1 overflow-auto">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map((item) => {
                  const { Icon, color } = getItemIcon(item);
                  return (
                    <button
                      key={`${item.source || 'local'}-${item.id}`}
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
        currentBusiness={currentBusiness}
        paymentMethodLookup={paymentMethodLookup}
        canVoid={canVoidSales}
        onVoided={() => {
          queryClient.setQueryData(['latest-closed-sale', businessId], (prev) => (prev ? { ...prev, status: 'voided' } : prev));
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
                <TicketActions saleId={saleId} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function POS() {
  return (
    <CartProvider>
      <POSContent />
    </CartProvider>
  );
}
