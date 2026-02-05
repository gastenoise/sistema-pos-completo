import React from 'react';
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBusiness } from '../BusinessContext';
import { formatPrice } from '@/lib/formatPrice';
import { getPaymentMethodIcon } from '@/utils/paymentMethodIcons';

export default function PaymentCardDraft({
  payment,
  paymentMethods,
  isEditable,
  onChangeMethod,
  onChangeAmount,
  onRemove,
  canRemove
}) {
  const { currentBusiness } = useBusiness();

  const color = payment.method.color || '#6B7280';
  const MethodIcon = getPaymentMethodIcon(payment.method.icon);

  return (
    <div 
      className="border-2 rounded-lg p-4"
      style={{ borderColor: color + '40', backgroundColor: color + '08' }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: color + '20' }}
        >
          <MethodIcon className="w-5 h-5" style={{ color }} />
        </div>

        <div className="flex-1 space-y-2">
          {/* Method Selector */}
          <Select 
            value={payment.method.id} 
            onValueChange={(methodId) => {
              const method = paymentMethods.find(m => m.id === methodId);
              if (method) onChangeMethod(method);
            }}
          >
            <SelectTrigger>
              <SelectValue>{payment.method.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((method) => (
                <SelectItem key={method.id} value={method.id}>
                  {method.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Amount Input */}
          {isEditable ? (
            <Input
              type="number"
              step="0.01"
              value={payment.amount || ''}
              onChange={(e) => onChangeAmount(e.target.value)}
              placeholder="0.00"
              className="font-medium"
            />
          ) : (
            <p className="text-xl font-bold" style={{ color }}>
              {formatPrice(payment.amount, currentBusiness)}
            </p>
          )}
        </div>

        {canRemove && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
