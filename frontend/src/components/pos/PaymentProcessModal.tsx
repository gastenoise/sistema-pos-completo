import React, { useState } from 'react';
import { 
  QrCode, Loader2, CheckCircle2, 
  CreditCard, Mail, MessageCircle, Building
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBusiness } from './BusinessContext';
import { formatPrice } from '@/lib/formatPrice';

export default function PaymentProcessModal({ 
  open, 
  onClose, 
  payment,
  businessData,
  onConfirm,
  currentIndex = 0,
  totalPayments = 1
}) {
  const [loading, setLoading] = useState(false);
  const { currentBusiness } = useBusiness();

  if (!payment) return null;

  const isMultiPayment = totalPayments > 1;
  const _isLastPayment = currentIndex === totalPayments - 1;

  const handleConfirm = async () => {
    setLoading(true);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    onConfirm();
    setLoading(false);
  };

  const renderMercadoPagoFlow = () => (
    <div className="space-y-4">
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <QrCode className="w-5 h-5 text-sky-600" />
          <span className="font-medium text-sky-900">Mercado Pago QR</span>
        </div>
        
        <div className="bg-white p-4 rounded-lg text-center mb-3">
          <div className="w-48 h-48 mx-auto bg-slate-200 rounded-lg flex items-center justify-center">
            <QrCode className="w-24 h-24 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Scan to pay {formatPrice(payment.amount, currentBusiness)}</p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(`https://wa.me/?text=Pay ${formatPrice(payment.amount, currentBusiness)}`, '_blank')}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            WhatsApp
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(`mailto:?subject=Payment Request&body=Pay ${formatPrice(payment.amount, currentBusiness)}`, '_blank')}
          >
            <Mail className="w-4 h-4 mr-1" />
            Email
          </Button>
        </div>
      </div>

      <p className="text-sm text-slate-600 text-center">
        Waiting for payment confirmation...
      </p>
    </div>
  );

  const renderTransferFlow = () => (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building className="w-5 h-5 text-amber-600" />
          <span className="font-medium text-amber-900">Bank Transfer Details</span>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Bank:</span>
            <span className="font-medium">Banco Example</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Account:</span>
            <span className="font-medium">1234-5678-9012</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">CBU/CVU:</span>
            <span className="font-medium">0123456789012345678901</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Holder:</span>
            <span className="font-medium">{businessData?.name || 'Business'}</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="text-slate-600">Amount:</span>
            <span className="font-bold text-lg">{formatPrice(payment.amount, currentBusiness)}</span>
          </div>
        </div>
      </div>

      <Button 
        className="w-full bg-amber-600 hover:bg-amber-700"
        onClick={handleConfirm}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <CheckCircle2 className="w-5 h-5 mr-2" />
        )}
        Confirm Transfer Received
      </Button>
    </div>
  );

  const renderCashFlow = () => (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CreditCard className="w-16 h-16 mx-auto mb-3 text-green-600" />
        <p className="text-2xl font-bold text-green-900 mb-1">{formatPrice(payment.amount, currentBusiness)}</p>
        <p className="text-sm text-green-700">Cash Payment</p>
      </div>

      <Button 
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={handleConfirm}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <CheckCircle2 className="w-5 h-5 mr-2" />
        )}
        Confirm Cash Received
      </Button>
    </div>
  );

  const renderDebitCreditFlow = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <CreditCard className="w-16 h-16 mx-auto mb-3 text-blue-600" />
        <p className="text-2xl font-bold text-blue-900 mb-1">{formatPrice(payment.amount, currentBusiness)}</p>
        <p className="text-sm text-blue-700">{payment.method?.name} Payment</p>
      </div>

      <Button 
        className="w-full bg-blue-600 hover:bg-blue-700"
        onClick={handleConfirm}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <CheckCircle2 className="w-5 h-5 mr-2" />
        )}
        Confirm Card Payment
      </Button>
    </div>
  );

  const renderContent = () => {
    switch (payment.method?.type) {
      case 'mercado_pago':
        return renderMercadoPagoFlow();
      case 'transfer':
        return renderTransferFlow();
      case 'cash':
        return renderCashFlow();
      case 'debit':
      case 'credit':
        return renderDebitCreditFlow();
      default:
        return renderCashFlow();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Process Payment {isMultiPayment && `(${currentIndex + 1}/${totalPayments})`}
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
