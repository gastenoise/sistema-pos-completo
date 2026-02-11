import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [saleId, setSaleId] = useState(null);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Load offline queue
    const savedQueue = localStorage.getItem('offlineQueue');
    if (savedQueue) {
      try {
        setOfflineQueue(JSON.parse(savedQueue));
      } catch (e) {
        console.error('Failed to parse offline queue');
      }
    }

    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const resolveCartLineId = (item) => {
    if (item?.is_custom) {
      return item.line_id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    return item.id;
  };

  const addToCart = (item, quantity = 1) => {
    const cartLineId = resolveCartLineId(item);

    setCartItems(prev => {
      const existing = prev.find((i) => i.cart_line_id === cartLineId);
      if (existing) {
        return prev.map((i) =>
          i.cart_line_id === cartLineId
            ? { ...i, quantity: i.quantity + quantity, subtotal: (i.quantity + quantity) * i.unit_price }
            : i
        );
      }

      const normalizedPrice = Number(item.price ?? item.unit_price ?? 0);

      return [...prev, {
        cart_line_id: cartLineId,
        item_id: item?.is_custom ? null : item.id,
        is_custom: Boolean(item?.is_custom),
        custom_label: item?.custom_label || null,
        name: item.name,
        unit_price: normalizedPrice,
        category_id: item.category_id ?? null,
        quantity,
        subtotal: normalizedPrice * quantity
      }];
    });
  };

  const updateQuantity = (cartLineId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(cartLineId);
      return;
    }

    setCartItems((prev) =>
      prev.map((i) =>
        i.cart_line_id === cartLineId
          ? { ...i, quantity, subtotal: quantity * i.unit_price }
          : i
      )
    );
  };

  const removeFromCart = (cartLineId) => {
    setCartItems((prev) => prev.filter((i) => i.cart_line_id !== cartLineId));
  };

  const clearCart = () => {
    setCartItems([]);
    setSaleId(null);
  };

  const getTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const addToOfflineQueue = (saleData) => {
    const newQueue = [...offlineQueue, { ...saleData, queued_at: new Date().toISOString() }];
    setOfflineQueue(newQueue);
    localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
  };

  const removeFromOfflineQueue = (index) => {
    const newQueue = offlineQueue.filter((_, i) => i !== index);
    setOfflineQueue(newQueue);
    localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
  };

  const clearOfflineQueue = () => {
    setOfflineQueue([]);
    localStorage.removeItem('offlineQueue');
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      setCartItems,
      saleId,
      setSaleId,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      getTotal,
      offlineQueue,
      addToOfflineQueue,
      removeFromOfflineQueue,
      clearOfflineQueue,
      isOnline
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

export default CartContext;
