import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  QrCode, Send, Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from './CartContext';
import { getPaymentMethodIcon } from '@/utils/paymentMethodIcons';
import { useBusiness } from './BusinessContext';
import { formatPrice } from '@/lib/formatPrice';

export default function PaymentConfirmModal({ 
  open, 
  onClose, 
  paymentMethods = [],
  onConfirm,
  loading = false,
  qrData = null,
  onRequestQR,
  loadingQR = false
}) {
  const { getTotal, cartItems } = useCart();
  const { currentBusiness } = useBusiness();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  
  const total = getTotal();

  useEffect(() => {
    if (open && paymentMethods.length > 0) {
      // Default to cash
      const cashMethod = paymentMethods.find(m => (m.type || m.code) === 'cash');
      setSelectedMethod(cashMethod || paymentMethods[0]);
    }
  }, [open, paymentMethods]);

  useEffect(() => {
    // Request QR when mercado_pago is selected
    if ((selectedMethod?.type || selectedMethod?.code) === 'mercado_pago' && !qrData && !loadingQR) {
      onRequestQR?.();
    }
  }, [selectedMethod]);

  const handleConfirm = () => {
    onConfirm({
      payment_method_id: selectedMethod?.id,
      payment_method_type: selectedMethod?.type || selectedMethod?.code,
      payment_reference: paymentReference || undefined
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleConfirm();
    }
  };

  const handleSendQR = (type) => {
    // In a real app, this would open WhatsApp or email
    if (type === 'whatsapp' && qrData) {
      window.open(`https://wa.me/?text=${encodeURIComponent(`Pay ${formatPrice(total, currentBusiness)}: ${qrData}`)}`, '_blank');
    } else if (type === 'email') {
      window.open(`mailto:?subject=Payment Request&body=${encodeURIComponent(`Pay ${formatPrice(total, currentBusiness)}: ${qrData}`)}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Confirm Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Total Display */}
          <div className="bg-slate-100 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-600 mb-1">Total to Pay</p>
            <p className="text-4xl font-bold text-slate-900">{formatPrice(total, currentBusiness)}</p>
            <p className="text-sm text-slate-500 mt-2">
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.filter(m => m.is_active && (m.enabled !== false || (m.type || m.code) !== 'mercado_pago')).map((method) => {
                const Icon = getPaymentMethodIcon(method.icon);
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method)}
                    className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                      selectedMethod?.id === method.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{method.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mercado Pago QR */}
          {(selectedMethod?.type || selectedMethod?.code) === 'mercado_pago' && (
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="w-5 h-5 text-sky-600" />
                <span className="font-medium text-sky-900">Mercado Pago QR</span>
              </div>
              
              {loadingQR ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                </div>
              ) : qrData ? (
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-lg text-center">
                    <div className="w-32 h-32 mx-auto bg-slate-200 rounded-lg flex items-center justify-center">
                      <QrCode className="w-16 h-16 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2 break-all">{qrData}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleSendQR('whatsapp')}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      WhatsApp
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleSendQR('email')}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-sky-700">QR code will be generated when sale is created</p>
              )}
            </div>
          )}

          {/* Reference Input for certain payment types */}
          {selectedMethod?.requires_reference && (
            <div>
              <Label htmlFor="reference">Reference / Transaction ID</Label>
              <Input
                id="reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Enter reference number"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              className="flex-[2] bg-green-600 hover:bg-green-700"
              onClick={handleConfirm}
              disabled={loading || !selectedMethod}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Check className="w-5 h-5 mr-2" />
              )}
              Confirm Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
