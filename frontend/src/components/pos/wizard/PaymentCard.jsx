import React, { useState } from 'react';
import { CheckCircle2, Clock, Loader2, XCircle, Banknote, CreditCard, Building, QrCode } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QrModal from './QrModal';

export default function PaymentCard({
  payment,
  businessData,
  bankAccountData,
  onUpdateStatus
}) {
  const [showQrModal, setShowQrModal] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  };

  const paymentMethodColors = {
    cash: '#10B981',
    debit: '#3B82F6',
    credit: '#8B5CF6',
    mercado_pago: '#0EA5E9',
    transfer: '#F59E0B',
    other: '#6B7280'
  };

  const statusConfig = {
    pending: { icon: Clock, color: 'bg-amber-100 text-amber-800', label: 'Pending' },
    processing: { icon: Loader2, color: 'bg-blue-100 text-blue-800', label: 'Processing' },
    confirmed: { icon: CheckCircle2, color: 'bg-green-100 text-green-800', label: 'Confirmed' },
    failed: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Failed' }
  };

  const status = statusConfig[payment.status] || statusConfig.pending;
  const color = payment.method?.color || paymentMethodColors[payment.payment_method_type];
  const Icon = status.icon;

  const handleConfirmCash = () => {
    onUpdateStatus(payment.id, 'confirmed');
  };

  const handleStartMercadoPago = () => {
    setShowQrModal(true);
    onUpdateStatus(payment.id, 'processing');
  };

  const handleConfirmTransfer = () => {
    onUpdateStatus(payment.id, 'confirmed');
  };

  const handleConfirmCard = () => {
    onUpdateStatus(payment.id, 'confirmed');
  };

  const renderActions = () => {
    if (payment.status === 'confirmed') {
      return <Badge className="bg-green-600">Confirmed</Badge>;
    }

    switch (payment.payment_method_type) {
      case 'cash':
        return (
          <Button 
            size="sm"
            onClick={handleConfirmCash}
            className="bg-green-600 hover:bg-green-700"
          >
            <Banknote className="w-4 h-4 mr-2" />
            Confirm Cash Received
          </Button>
        );
      
      case 'mercado_pago':
        if (payment.status === 'processing') {
          return (
            <Button 
              size="sm"
              variant="outline"
              onClick={() => setShowQrModal(true)}
            >
              <QrCode className="w-4 h-4 mr-2" />
              View QR Code
            </Button>
          );
        }
        return (
          <Button 
            size="sm"
            onClick={handleStartMercadoPago}
            className="bg-sky-600 hover:bg-sky-700"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Generate QR Code
          </Button>
        );
      
      case 'transfer':
        return (
          <div className="space-y-2">
            {payment.status === 'pending' && (
              <div className="text-xs space-y-1 bg-slate-50 p-2 rounded">
                <p><strong>Bank:</strong> {bankAccountData?.bank_name || 'Not configured'}</p>
                <p><strong>Account:</strong> {bankAccountData?.account_number || 'Not configured'}</p>
                {bankAccountData?.alias && <p><strong>Alias:</strong> {bankAccountData.alias}</p>}
                <p><strong>CBU/CVU:</strong> {bankAccountData?.cbu_cvu || 'Not configured'}</p>
              </div>
            )}
            <Button 
              size="sm"
              onClick={handleConfirmTransfer}
              className="bg-amber-600 hover:bg-amber-700 w-full"
            >
              <Building className="w-4 h-4 mr-2" />
              Confirm Transfer Received
            </Button>
          </div>
        );
      
      case 'debit':
      case 'credit':
        return (
          <Button 
            size="sm"
            onClick={handleConfirmCard}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Confirm Card Payment
          </Button>
        );
      
      default:
        return (
          <Button 
            size="sm"
            onClick={() => onUpdateStatus(payment.id, 'confirmed')}
          >
            Confirm Payment
          </Button>
        );
    }
  };

  return (
    <>
      <div 
        className="border-2 rounded-lg p-4"
        style={{ borderColor: color + '40', backgroundColor: color + '08' }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: color + '20' }}
            >
              <CreditCard className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="font-medium capitalize">{payment.method?.name || payment.payment_method_type}</p>
              <p className="text-2xl font-bold" style={{ color }}>
                {formatPrice(payment.amount)}
              </p>
            </div>
          </div>
          
          <Badge className={status.color}>
            <Icon className={`w-3 h-3 mr-1 ${payment.status === 'processing' ? 'animate-spin' : ''}`} />
            {status.label}
          </Badge>
        </div>

        <div className="mt-3">
          {renderActions()}
        </div>
      </div>

      {payment.payment_method_type === 'mercado_pago' && (
        <QrModal
          open={showQrModal}
          onClose={() => setShowQrModal(false)}
          amount={payment.amount}
          onConfirm={() => {
            onUpdateStatus(payment.id, 'confirmed');
            setShowQrModal(false);
          }}
        />
      )}
    </>
  );
}