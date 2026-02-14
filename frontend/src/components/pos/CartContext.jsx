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

  const addToCart = (item, quantity = 1) => {
    setCartItems(prev => {
      const incomingKey = item.is_quick_item
        ? `quick-${item.name}-${item.price}-${item.category_id ?? 'none'}`
        : String(item.id);

      const existing = prev.find((i) => {
        const rowKey = i.is_quick_item
          ? `quick-${i.name}-${i.unit_price}-${i.category_id ?? 'none'}`
          : String(i.item_id);
        return rowKey === incomingKey;
      });

      if (existing) {
        return prev.map((i) => {
          const rowKey = i.is_quick_item
            ? `quick-${i.name}-${i.unit_price}-${i.category_id ?? 'none'}`
            : String(i.item_id);

          return rowKey === incomingKey
            ? { ...i, quantity: i.quantity + quantity, subtotal: (i.quantity + quantity) * i.unit_price }
            : i;
        });
      }

      return [...prev, {
        item_id: item.id,
        name: item.name,
        unit_price: item.price,
        category_id: item.category_id ?? null,
        is_quick_item: Boolean(item.is_quick_item),
        quantity,
        subtotal: item.price * quantity
      }];
    });
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCartItems(prev => 
      prev.map(i => 
        i.item_id === itemId 
          ? { ...i, quantity, subtotal: quantity * i.unit_price }
          : i
      )
    );
  };

  const removeFromCart = (itemId) => {
    setCartItems(prev => prev.filter(i => i.item_id !== itemId));
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
