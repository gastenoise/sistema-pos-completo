import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Loader2, QrCode, XCircle } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from '../BusinessContext';
import { formatPrice } from '@/lib/formatPrice';
import { getPaymentMethodIcon } from '@/utils/paymentMethodIcons';
import PaymentShareActions from './PaymentShareActions';

const resolveBankAccountData = (bankAccountData: any = {}) => ({
  bank_name: bankAccountData.bank_name || '',
  account_holder_name: bankAccountData.account_holder_name || '',
  cbu: bankAccountData.cbu || '',
  alias: bankAccountData.alias || '',
});

const buildTransferPlainText = (bankAccountData: any) => {
  const lines = [
    'Datos bancarios para transferencia:',
    `Banco: ${bankAccountData.bank_name || 'No configurado'}`,
    `Titular: ${bankAccountData.account_holder_name || 'No configurado'}`,
    `CBU/CVU: ${bankAccountData.cbu || 'No configurado'}`,
    `Alias: ${bankAccountData.alias || 'No configurado'}`,
  ];

  return lines.join('\n');
};

export default function PaymentCard({
  payment,
  businessData: _businessData,
  bankAccountData,
  onUpdateStatus
}: any) {
  const [loading, setLoading] = useState(false);
  const { currentBusiness } = useBusiness();

  const statusConfig = {
    pending: { icon: Clock, color: 'bg-amber-100 text-amber-800', label: 'Pendiente' },
    processing: { icon: Loader2, color: 'bg-blue-100 text-blue-800', label: 'Procesando' },
    confirmed: { icon: CheckCircle2, color: 'bg-green-100 text-green-800', label: 'Confirmado' },
    failed: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Falló' }
  };

  const status = statusConfig[payment.status] || statusConfig.pending;
  const color = payment.method?.color || '#6B7280';
  const Icon = status.icon;
  const MethodIcon = getPaymentMethodIcon(payment.method?.icon);
  const paymentMethodType = payment.payment_method_type || payment.method?.type || payment.method?.code;
  const accountData = resolveBankAccountData(bankAccountData);
  const transferText = buildTransferPlainText(accountData);

  const mercadoPagoLink = payment.payment_reference || payment.reference || 'https://mercadopago.com/example-qr';
  const mercadoPagoShareText = useMemo(() => ([
    'Link de cobro por Mercado Pago:',
    mercadoPagoLink,
    `Importe: ${formatPrice(payment.amount, currentBusiness)}`,
  ].join('\n')), [mercadoPagoLink, payment.amount, currentBusiness]);

  const confirmPayment = async (statusValue) => {
    setLoading(true);
    try {
      await onUpdateStatus(payment.id, statusValue);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCash = () => confirmPayment('confirmed');
  const handleConfirmTransfer = () => confirmPayment('confirmed');
  const handleConfirmMercadoPago = () => confirmPayment('confirmed');
  const handleConfirmCard = () => confirmPayment('confirmed');

  const renderActions = () => {
    if (payment.status === 'confirmed') {
      return <Badge className="bg-green-600">Confirmado</Badge>;
    }

    switch (paymentMethodType) {
      case 'cash':
        return (
          <Button
            size="sm"
            onClick={handleConfirmCash}
            disabled={loading}
            className="bg-green-700 hover:bg-green-800"
          >
            <MethodIcon className="w-4 h-4 mr-2" style={{ color }} />
            {loading ? 'Confirmando...' : 'Confirmar Efectivo Recibido'}
          </Button>
        );

      case 'mercado_pago':
        return (
          <div className="space-y-3">
            <div className="rounded-md border bg-sky-50 p-3">
              <div className="flex items-center gap-2 mb-2 text-sky-800">
                <QrCode className="w-4 h-4" />
                <span className="text-sm font-medium">QR Mercado Pago</span>
              </div>
              <div className="w-20 h-20 rounded-md bg-white border border-sky-200 flex items-center justify-center">
                <QrCode className="w-10 h-10 text-sky-400" />
              </div>
              <p className="text-xs text-slate-600 mt-2 break-all">{mercadoPagoLink}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <PaymentShareActions
                shareText={mercadoPagoShareText}
                whatsappTitle="Compartir link de pago por WhatsApp"
                emailTitle="Compartir link de pago por e-mail"
                defaultSubject="Link de pago Mercado Pago"
                defaultMessage={`Te compartimos el link para abonar ${formatPrice(payment.amount, currentBusiness)}.`}
                phoneFieldId={`payment-mp-whatsapp-${payment.id}`}
                fieldPrefix={`payment-mp-share-${payment.id}`}
              />

              <Button
                size="sm"
                onClick={handleConfirmMercadoPago}
                disabled={loading}
                className="bg-sky-600 hover:bg-sky-700"
              >
                <MethodIcon className="w-4 h-4 mr-2" style={{ color }} />
                {loading ? 'Confirmando...' : 'Confirmar pago recibido'}
              </Button>
            </div>
          </div>
        );

      case 'transfer':
      case 'bank_transfer':
        return (
          <div className="space-y-2">
            <div className="text-xs space-y-1 bg-slate-50 p-2 rounded">
              <p><strong>Bank:</strong> {accountData.bank_name || 'Not configured'}</p>
              <p><strong>Holder:</strong> {accountData.account_holder_name || 'Not configured'}</p>
              <p><strong>CBU:</strong> {accountData.cbu || 'Not configured'}</p>
              <p><strong>Alias:</strong> {accountData.alias || 'Not configured'}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <PaymentShareActions
                shareText={transferText}
                whatsappTitle="Compartir datos bancarios por WhatsApp"
                emailTitle="Compartir datos bancarios por e-mail"
                defaultSubject="Datos bancarios para transferencia"
                defaultMessage="Te compartimos los datos bancarios para realizar la transferencia."
                phoneFieldId={`payment-transfer-whatsapp-${payment.id}`}
                fieldPrefix={`payment-transfer-share-${payment.id}`}
              />

              <Button
                size="sm"
                onClick={handleConfirmTransfer}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <MethodIcon className="w-4 h-4 mr-2" style={{ color }} />
                {loading ? 'Confirmando...' : 'Confirmar pago recibido'}
              </Button>
            </div>
          </div>
        );

      case 'debit':
      case 'credit':
        return (
          <Button
            size="sm"
            onClick={handleConfirmCard}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <MethodIcon className="w-4 h-4 mr-2" style={{ color }} />
            {loading ? 'Confirming...' : 'Confirm Card Payment'}
          </Button>
        );

      default:
        return (
          <Button
            size="sm"
            onClick={() => confirmPayment('confirmed')}
            disabled={loading}
          >
            {loading ? 'Confirming...' : 'Confirm Payment'}
          </Button>
        );
    }
  };

  return (
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
            <MethodIcon className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <p className="font-medium capitalize">{payment.method?.name || payment.payment_method_type}</p>
            <p className="text-2xl font-bold" style={{ color }}>
              {formatPrice(payment.amount, currentBusiness)}
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
  );
}
