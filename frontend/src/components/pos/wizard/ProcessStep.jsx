import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import PaymentCard from './PaymentCard';

export default function ProcessStep({
  payments,
  businessData,
  bankAccountData,
  onUpdateStatus,
  onBackToDivision
}) {
  const hasAnyProcessing = payments.some(p => p.status === 'processing' || p.status === 'confirmed');

  return (
    <div className="space-y-4">
      {/* Back Button */}
      {/* {!hasAnyProcessing && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={onBackToDivision}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Division
        </Button>
      )} */}

      {/* Payment Cards */}
      <div className="space-y-3">
        {payments.map((payment) => (
          <PaymentCard
            key={payment.id}
            payment={payment}
            businessData={businessData}
            bankAccountData={bankAccountData}
            onUpdateStatus={onUpdateStatus}
          />
        ))}
      </div>

      {/* Status Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p className="text-slate-500">Pending</p>
            <p className="text-lg font-bold text-amber-600">
              {payments.filter(p => p.status === 'pending').length}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Processing</p>
            <p className="text-lg font-bold text-blue-600">
              {payments.filter(p => p.status === 'processing').length}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Confirmed</p>
            <p className="text-lg font-bold text-green-600">
              {payments.filter(p => p.status === 'confirmed').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}