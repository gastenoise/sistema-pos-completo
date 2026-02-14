import React, { useState } from 'react';
import { CheckCircle2, Clock, Loader2, Mail, MessageCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QrModal from './QrModal';
import { useBusiness } from '../BusinessContext';
import { formatPrice } from '@/lib/formatPrice';
import { getPaymentMethodIcon } from '@/utils/paymentMethodIcons';
import EmailShareDialog from '@/components/payments/EmailShareDialog';
import WhatsappShareDialog from '@/components/payments/WhatsappShareDialog';
import { sanitizeEmailAddress, sanitizePhoneNumber } from '@/lib/sanitize';

const resolveBankAccountData = (bankAccountData = {}) => ({
  bank_name: bankAccountData.bank_name || '',
  account_holder_name: bankAccountData.account_holder_name || '',
  cbu: bankAccountData.cbu || '',
  alias: bankAccountData.alias || '',
});

const buildTransferPlainText = (bankAccountData) => {
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
}) {
  const [showQrModal, setShowQrModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isWhatsappDialogOpen, setIsWhatsappDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSharingWhatsapp, setIsSharingWhatsapp] = useState(false);
  const [isSharingEmail, setIsSharingEmail] = useState(false);
  const { currentBusiness } = useBusiness();

  const statusConfig = {
    pending: { icon: Clock, color: 'bg-amber-100 text-amber-800', label: 'Pending' },
    processing: { icon: Loader2, color: 'bg-blue-100 text-blue-800', label: 'Processing' },
    confirmed: { icon: CheckCircle2, color: 'bg-green-100 text-green-800', label: 'Confirmed' },
    failed: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Failed' }
  };

  const status = statusConfig[payment.status] || statusConfig.pending;
  const color = payment.method?.color || '#6B7280';
  const Icon = status.icon;
  const MethodIcon = getPaymentMethodIcon(payment.method?.icon);
  const paymentMethodType = payment.payment_method_type || payment.method?.type || payment.method?.code;
  const accountData = resolveBankAccountData(bankAccountData);
  const transferText = buildTransferPlainText(accountData);

  const confirmPayment = async (statusValue) => {
    setLoading(true);
    try {
      await onUpdateStatus(payment.id, statusValue);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCash = () => confirmPayment('confirmed');

  const handleStartMercadoPago = () => {
    setShowQrModal(true);
  };

  const handleConfirmTransfer = () => confirmPayment('confirmed');

  const handleConfirmCard = () => confirmPayment('confirmed');

  const handleShareWhatsapp = async (phoneNumber) => {
    if (!phoneNumber) return;

    try {
      setIsSharingWhatsapp(true);
      const safePhoneNumber = sanitizePhoneNumber(phoneNumber);
      if (!safePhoneNumber) return;
      const whatsappUrl = `https://wa.me/${safePhoneNumber}?text=${encodeURIComponent(transferText)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      setIsWhatsappDialogOpen(false);
      toast.success('WhatsApp abierto con los datos bancarios listos para enviar.');
    } catch (error) {
      toast.error(error?.message || 'No se pudo abrir WhatsApp.');
    } finally {
      setIsSharingWhatsapp(false);
    }
  };

  const handleShareEmail = async ({ to_email, subject, message }) => {
    if (!to_email?.trim()) return;

    try {
      setIsSharingEmail(true);
      const safeEmail = sanitizeEmailAddress(to_email);
      if (!safeEmail) return;

      const finalSubject = subject?.trim() || 'Datos bancarios para transferencia';
      const bodyParts = [];
      if (message?.trim()) {
        bodyParts.push(message.trim(), '');
      }
      bodyParts.push(transferText);

      const mailtoUrl = `mailto:${encodeURIComponent(safeEmail)}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(bodyParts.join('\n'))}`;
      window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
      setIsEmailDialogOpen(false);
      toast.success('Cliente de correo abierto con los datos bancarios.');
    } catch (error) {
      toast.error(error?.message || 'No se pudo abrir el cliente de correo.');
    } finally {
      setIsSharingEmail(false);
    }
  };

  const renderActions = () => {
    if (payment.status === 'confirmed') {
      return <Badge className="bg-green-600">Confirmed</Badge>;
    }

    switch (paymentMethodType) {
      case 'cash':
        return (
          <Button
            size="sm"
            onClick={handleConfirmCash}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <MethodIcon className="w-4 h-4 mr-2" style={{ color }} />
            {loading ? 'Confirming...' : 'Confirm Cash Received'}
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
              <MethodIcon className="w-4 h-4 mr-2" style={{ color }} />
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
            <MethodIcon className="w-4 h-4 mr-2" style={{ color }} />
            Generate QR Code
          </Button>
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsWhatsappDialogOpen(true)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Compartir por WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEmailDialogOpen(true)}
              >
                <Mail className="w-4 h-4 mr-2" />
                Compartir por e-mail
              </Button>
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

      <WhatsappShareDialog
        open={isWhatsappDialogOpen}
        onOpenChange={setIsWhatsappDialogOpen}
        isSharing={isSharingWhatsapp}
        onConfirm={handleShareWhatsapp}
        title="Compartir datos bancarios por WhatsApp"
        phoneFieldId="payment-transfer-whatsapp-phone"
      />

      <EmailShareDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        isSending={isSharingEmail}
        onSend={handleShareEmail}
        defaultSubject="Datos bancarios para transferencia"
        defaultMessage="Te compartimos los datos bancarios para realizar la transferencia."
        title="Compartir datos bancarios por e-mail"
        submitLabel="Abrir e-mail"
        fieldPrefix="payment-transfer-share"
      />

      {paymentMethodType === 'mercado_pago' && (
        <QrModal
          open={showQrModal}
          onClose={() => setShowQrModal(false)}
          amount={payment.amount}
          onConfirm={async () => {
            await confirmPayment('confirmed');
            setShowQrModal(false);
          }}
        />
      )}
    </>
  );
}
