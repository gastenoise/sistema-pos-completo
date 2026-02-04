import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Package, Plus, Loader2, ShoppingBag, Coffee,
  Utensils, Shirt, Laptop, Smartphone, Book, Wrench, Home, Car, Heart,
  Gamepad, Pizza, Apple, Cake, Watch, Glasses, Plane, Music,
  Camera, Dumbbell, Paintbrush, Hammer, Scissors, Zap, Star, Gift, Tag, CreditCard
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

import { useBusiness } from '../components/pos/BusinessContext';
import { useCart, CartProvider } from '../components/pos/CartContext';
import { useAuth } from '../lib/AuthContext';
import TopNav from '../components/pos/TopNav';
import SaleCart from '../components/pos/SaleCart';
import PaymentWizardNew from '../components/pos/PaymentWizardNew';
import CashRegisterOpenModal from '../components/pos/CashRegisterOpenModal';
import QuickAddForm from '../components/pos/QuickAddForm';
import NetworkIndicator from '../components/pos/NetworkIndicator';
import GenericItemForm from '../components/pos/GenericItemForm';

function POSContent() {
  const { businessId, currentBusiness } = useBusiness();
  const { addToCart, cartItems, clearCart, isOnline, addToOfflineQueue, offlineQueue, clearOfflineQueue } = useCart();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [showCashOpenModal, setShowCashOpenModal] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  
  const searchInputRef = useRef(null);

  const normalizeList = (response, fallbackKey) => {
    if (Array.isArray(response)) return response;
    if (!response) return [];
    return response?.[fallbackKey]
      || response?.data
      || response?.items
      || response?.results
      || [];
  };

  // Fetch items
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['items', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/items');
      return normalizeList(response, 'items').filter((item) => item.is_active !== false);
    },
    enabled: !!businessId
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/categories');
      return normalizeList(response, 'categories');
    },
    enabled: !!businessId
  });

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['paymentMethods', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/payment-methods');
      const methods = normalizeList(response, 'payment_methods');
      return methods.filter((method) => (method.is_active ?? method.active) !== false);
    },
    enabled: !!businessId
  });

  // Fetch bank account data
  const { data: bankAccountData } = useQuery({
    queryKey: ['bankAccount', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const response = await apiClient.get('/protected/banks');
      const accounts = normalizeList(response, 'banks');
      return accounts.length > 0 ? accounts[0] : null;
    },
    enabled: !!businessId
  });

  // Fetch cash register status
  const { data: cashRegisterStatus, refetch: refetchCashStatus } = useQuery({
    queryKey: ['cashRegisterStatus', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const response = await apiClient.get('/protected/cash-register/status');
      const status = response?.status || response?.data?.status;
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

  const createSaleFlow = async ({ sale, items, payments }) => {
    const saleResponse = await apiClient.post('/protected/sales', sale);
    const saleId = extractSaleId(saleResponse);
    if (!saleId) {
      throw new Error('Sale ID missing from response');
    }

    await Promise.all(
      items.map((item) =>
        apiClient.post(`/protected/sales/${saleId}/items`, {
          item_id: item.item_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })
      )
    );

    await Promise.all(
      payments.map((payment) =>
        apiClient.post(`/protected/sales/${saleId}/payments`, {
          amount: payment.amount,
          payment_method: payment.payment_method_type,
          ...(payment.payment_reference && { reference: payment.payment_reference })
        })
      )
    );

    await apiClient.post(`/protected/sales/${saleId}/close`, {
      notes: 'Venta completada'
    });
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
    
    // Check cash register status
    if (cashRegisterStatus?.status === 'closed') {
      setShowCashOpenModal(true);
      return;
    }
    
    setShowWizard(true);
  };

  const handleOpenCashRegister = async (openingAmount) => {
    try {
      await apiClient.post('/protected/cash-register/open', {
        amount: openingAmount
      });
      await refetchCashStatus();
      setShowCashOpenModal(false);
      toast.success('Cash register opened');
      
      // If there was a pending payment, continue
      if (pendingPayment) {
        setShowWizard(true);
      }
    } catch (error) {
      toast.error('Failed to open cash register');
    }
  };

  const handleWizardComplete = async (persistedPayments) => {
    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    const saleBase = {
      business_id: businessId,
      cash_register_session_id: cashRegisterStatus?.id,
      status: 'open',
      subtotal: total,
      total: total
    };

    try {
      const salePayload = {
        sale: saleBase,
        items: cartItems,
        payments: persistedPayments
      };

      if (!isOnline) {
        addToOfflineQueue(salePayload);
      } else {
        await createSaleFlow(salePayload);
      }
      
      clearCart();
      
    } catch (error) {
      if (error.message?.includes('cash') || error.message?.includes('closed')) {
        setShowCashOpenModal(true);
        setShowWizard(false);
      } else {
        throw error;
      }
    }
  };

  const handleQuickAdd = async (itemData) => {
    try {
      const newItem = await apiClient.post('/protected/items', {
        ...itemData,
        is_active: true
      });
      const createdItem = newItem?.data ?? newItem;
      queryClient.invalidateQueries({ queryKey: ['items', businessId] });
      addToCart(createdItem);
      toast.success(`Created and added ${itemData.name}`);
    } catch (error) {
      toast.error('Failed to create item');
    }
  };

  const handleSyncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    
    let successCount = 0;
    let failCount = 0;
    
    for (const queuedSale of offlineQueue) {
      try {
        const normalizedSale = normalizeQueuedSale(queuedSale);
        await createSaleFlow(normalizedSale);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }
    
    clearOfflineQueue();
    
    if (successCount > 0) {
      toast.success(`Synced ${successCount} sale${successCount !== 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to sync ${failCount} sale${failCount !== 1 ? 's' : ''}`);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  };

  const getItemIcon = (item) => {
    const category = categories.find(c => c.id === item.category_id);
    const iconName = category?.icon || 'Package';
    const iconMap = {
      Package, ShoppingBag, Coffee, Utensils, Shirt, Laptop, Smartphone, 
      Book, Wrench, Home, Car, Heart, Gamepad, Pizza, Apple, Cake, Watch, 
      Glasses, Plane, Music, Camera, Dumbbell, Paintbrush, Hammer, Scissors, 
      Zap, Star, Gift, Tag, CreditCard
    };
    const IconComponent = iconMap[iconName] || Package;
    return { Icon: IconComponent, color: category?.color || '#94a3b8' };
  };

  const filteredItems = searchQuery
    ? items.filter((item) => {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.sku?.toLowerCase().includes(q);
      })
    : items;

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
                placeholder="Search items... (press /)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <QuickAddForm onAdd={handleQuickAdd} />
            <GenericItemForm onAdd={(item) => { addToCart(item); toast.success(`Added ${item.name}`); }} />
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
                <p className="text-lg font-medium">No items found</p>
                <p className="text-sm">
                  {searchQuery ? 'Try a different search.' : 'Add items from the Items page'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map((item) => {
                  const { Icon, color } = getItemIcon(item);
                  return (
                    <button
                      key={item.id}
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
                      <p className="text-base font-bold text-blue-600">{formatPrice(item.price)}</p>
                      {item.sku && (
                        <p className="text-xs text-slate-400 mt-0.5">{item.sku}</p>
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
            <h2 className="text-lg font-bold text-slate-900">Current Sale</h2>
            {cashRegisterStatus?.status === 'closed' && (
              <p className="text-xs text-amber-600 mt-1">Cash register is closed</p>
            )}
          </div>
          <SaleCart onCharge={handleCharge} />
        </div>
      </div>

      {/* Payment Wizard */}
      <PaymentWizardNew
        open={showWizard}
        onClose={() => setShowWizard(false)}
        total={cartItems.reduce((sum, item) => sum + item.subtotal, 0)}
        businessId={businessId}
        businessData={currentBusiness}
        bankAccountData={bankAccountData}
        paymentMethods={paymentMethods}
        onComplete={handleWizardComplete}
      />

      {/* Cash Register Open Modal */}
      <CashRegisterOpenModal
        open={showCashOpenModal}
        onClose={() => setShowCashOpenModal(false)}
        onConfirm={handleOpenCashRegister}
        showWarning={pendingPayment !== null}
      />

      {/* Network Indicator */}
      <NetworkIndicator onSyncQueue={handleSyncOfflineQueue} />
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
