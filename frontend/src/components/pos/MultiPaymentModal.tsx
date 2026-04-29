import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from './CartContext';
import { useBusiness } from './BusinessContext';
import { formatPrice } from '@/lib/formatPrice';
import { toCents, fromCents, sumToCents } from '@/lib/money';

export default function MultiPaymentModal({ 
  open, 
  onClose, 
  paymentMethods = [],
  onConfirm
}) {
  const { getTotal } = useCart();
  const { currentBusiness } = useBusiness();
  const total = getTotal();
  
  const [payments, setPayments] = useState([]);
  const [remaining, setRemaining] = useState(total);

  useEffect(() => {
    if (open) {
      // Default: full payment in cash
      const cashMethod = paymentMethods.find(m => (m.type || m.code) === 'cash');
      if (cashMethod) {
        setPayments([{ method: cashMethod, amount: total }]);
        setRemaining(0);
      }
    }
  }, [open, total, paymentMethods]);

  useEffect(() => {
    const paidCents = sumToCents(payments.map(p => p.amount));
    const totalCents = toCents(total);
    const remainingCents = totalCents - paidCents;
    setRemaining(fromCents(remainingCents));
  }, [payments, total]);

  const handleAddPayment = () => {
    const availableMethod = paymentMethods.find(m => 
      !payments.some(p => p.method.id === m.id)
    ) || paymentMethods[0];
    
    // Assign the remaining amount to the new payment method using safe cents arithmetic
    const totalCents = toCents(total);
    const currentTotalCents = sumToCents(payments.map(p => p.amount));
    const remainingCents = totalCents - currentTotalCents;
    const newAmount = fromCents(Math.max(0, remainingCents));
    
    setPayments([...payments, { method: availableMethod, amount: newAmount }]);
  };

  const handleUpdatePayment = (index, field, value) => {
    const updated = [...payments];
    if (field === 'method') {
      updated[index].method = value;
    } else if (field === 'amount') {
      updated[index].amount = value;
    }
    setPayments(updated);
  };

  const handleRemovePayment = (index) => {
    const filtered = payments.filter((_, i) => i !== index);
    
    // If exactly one payment remains, set its amount to the full total using safe cents arithmetic
    if (filtered.length === 1) {
      const totalCents = toCents(total);
      filtered[0].amount = fromCents(totalCents);
    }
    
    setPayments(filtered);
  };

  const handleConfirm = () => {
    onConfirm(payments);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Total Display */}
          <div className="bg-slate-100 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-600 mb-1">Total to Pay</p>
            <p className="text-3xl font-bold text-slate-900">{formatPrice(total, currentBusiness)}</p>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <Label>Payment Distribution</Label>
            {payments.map((payment, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Select 
                    value={payment.method.id} 
                    onValueChange={(id) => {
                      const method = paymentMethods.find(m => m.id === id);
                      handleUpdatePayment(index, 'method', method);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.filter(m => m.is_active).map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: method.color || '#6B7280' }}
                            />
                            {method.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    value={payment.amount}
                    onChange={(e) => handleUpdatePayment(index, 'amount', e.target.value)}
                    placeholder="Amount"
                  />
                </div>
                {payments.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemovePayment(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}

            {payments.length < paymentMethods.filter(m => m.is_active).length && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddPayment}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            )}
          </div>

          {/* Remaining Amount */}
          {remaining !== 0 && (
            <div className={`p-3 rounded-lg ${remaining > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-medium ${remaining > 0 ? 'text-amber-900' : 'text-red-900'}`}>
                {remaining > 0 ? 'Remaining' : 'Overpayment'}: {formatPrice(Math.abs(remaining), currentBusiness)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              className="flex-[2] bg-blue-600 hover:bg-blue-700"
              onClick={handleConfirm}
              disabled={remaining !== 0}
            >
              Process Payment
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
