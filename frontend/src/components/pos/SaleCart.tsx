import React from 'react';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from './CartContext';
import { useBusiness } from './BusinessContext';
import { formatPrice } from '@/lib/formatPrice';

export default function SaleCart({ onCharge, header }: { onCharge: () => void; header?: React.ReactNode }) {
  const { cartItems, updateQuantity, removeFromCart, getTotal, clearCart } = useCart();
  const { currentBusiness } = useBusiness();

  const total = getTotal();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header zone */}
      {header && <div className="shrink-0">{header}</div>}

      {/* Body zone - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-400 p-8 h-full">
            <ShoppingCart className="w-12 h-12 mb-3" />
            <p className="text-lg font-medium">Carro de compras vacío</p>
            <p className="text-sm">Agregá items para iniciar la venta</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {cartItems.map((item) => (
              <div
                key={item.cart_key}
                className="bg-white border border-slate-200 rounded-lg p-3"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{item.name}</p>
                    <p className="text-sm text-slate-500">{formatPrice(item.unit_price, currentBusiness)} c/u</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700"
                    onClick={() => removeFromCart(item.cart_key)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.cart_key, item.quantity - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-10 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.cart_key, item.quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <span className="font-bold text-slate-900">{formatPrice(item.subtotal, currentBusiness)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer zone - Fixed */}
      <div className="shrink-0 border-t border-slate-200 p-4 bg-white shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-medium text-slate-700">Total</span>
          <span className="text-2xl font-bold text-slate-900">{formatPrice(total, currentBusiness)}</span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={clearCart}
            disabled={cartItems.length === 0}
          >
            Limpiar
          </Button>
          <Button 
            className="flex-[2] bg-green-600 hover:bg-green-700 text-lg py-6"
            onClick={onCharge}
            disabled={cartItems.length === 0}
          >
            Cobrar {formatPrice(total, currentBusiness)}
          </Button>
        </div>
      </div>
    </div>
  );
}
