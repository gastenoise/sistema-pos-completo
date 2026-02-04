import React from 'react';
import { Plus } from 'lucide-react';
import PaymentCardDraft from './PaymentCardDraft';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DivisionStep({
  total,
  paymentsDraft,
  paymentMethods,
  onAddPayment,
  onRemovePayment,
  onChangeMethod,
  onChangeAmount
}) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  };

  const totalDraft = paymentsDraft.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remaining = total - totalDraft;
  const isMultiple = paymentsDraft.length > 1;
  
  const availableMethods = paymentMethods.filter(m => 
    !paymentsDraft.find(p => p.method.id === m.id)
  );

  return (
    <div className="space-y-6">
      {/* Total Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-sm text-blue-600 mb-1">Total to collect</p>
        <p className="text-3xl font-bold text-blue-900">{formatPrice(total)}</p>
      </div>

      {/* Payment Cards */}
      <div className="space-y-3">
        {paymentsDraft.map((payment) => (
          <PaymentCardDraft
            key={payment.id}
            payment={payment}
            paymentMethods={paymentMethods}
            isEditable={isMultiple}
            onChangeMethod={(method) => onChangeMethod(payment.id, method)}
            onChangeAmount={(amount) => onChangeAmount(payment.id, amount)}
            onRemove={() => onRemovePayment(payment.id)}
            canRemove={isMultiple}
          />
        ))}
      </div>

      {/* Add Payment Method */}
      {availableMethods.length > 0 && (
        <Select onValueChange={(methodId) => {
          const method = paymentMethods.find(m => m.id === methodId);
          if (method) onAddPayment(method);
        }}>
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <SelectValue placeholder="Add Payment Method" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {availableMethods.map((method) => (
              <SelectItem key={method.id} value={method.id}>
                {method.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Summary */}
      {isMultiple && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal:</span>
            <span className="font-medium">{formatPrice(totalDraft)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Remaining:</span>
            <span className={`font-medium ${remaining < 0 ? 'text-red-600' : remaining > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {formatPrice(Math.abs(remaining))}
            </span>
          </div>
          {Math.abs(remaining) > 0.01 && (
            <p className="text-xs text-amber-600 pt-2 border-t">
              Adjust amounts to match the total exactly
            </p>
          )}
        </div>
      )}
    </div>
  );
}
