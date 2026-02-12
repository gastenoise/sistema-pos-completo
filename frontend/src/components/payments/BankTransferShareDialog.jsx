import React, { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import EmailShareDialog from './EmailShareDialog';
import WhatsappShareDialog from './WhatsappShareDialog';

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

export default function BankTransferShareDialog({ open, onOpenChange, bankAccountData }) {
  const [isWhatsappDialogOpen, setIsWhatsappDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSharingWhatsapp, setIsSharingWhatsapp] = useState(false);
  const [isSharingEmail, setIsSharingEmail] = useState(false);

  const accountData = useMemo(() => resolveBankAccountData(bankAccountData), [bankAccountData]);
  const plainText = useMemo(() => buildTransferPlainText(accountData), [accountData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      toast.success('Datos bancarios copiados al portapapeles.');
    } catch (error) {
      toast.error(error?.message || 'No se pudieron copiar los datos bancarios.');
    }
  };

  const handleShareWhatsapp = async (phoneNumber) => {
    if (!phoneNumber) return;

    try {
      setIsSharingWhatsapp(true);
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(plainText)}`;
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
      const finalSubject = subject?.trim() || 'Datos bancarios para transferencia';
      const bodyParts = [];

      if (message?.trim()) {
        bodyParts.push(message.trim(), '');
      }

      bodyParts.push(plainText);
      const mailtoUrl = `mailto:${encodeURIComponent(to_email.trim())}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(bodyParts.join('\n'))}`;

      window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
      setIsEmailDialogOpen(false);
      toast.success('Cliente de correo abierto con los datos bancarios.');
    } catch (error) {
      toast.error(error?.message || 'No se pudo abrir el cliente de correo.');
    } finally {
      setIsSharingEmail(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compartir datos bancarios</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 rounded-md border bg-slate-50 p-3 text-sm">
            <p><strong>Banco:</strong> {accountData.bank_name || 'No configurado'}</p>
            <p><strong>Titular:</strong> {accountData.account_holder_name || 'No configurado'}</p>
            <p><strong>CBU/CVU:</strong> {accountData.cbu || 'No configurado'}</p>
            <p><strong>Alias:</strong> {accountData.alias || 'No configurado'}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Texto para compartir</p>
            <textarea
              readOnly
              value={plainText}
              rows={7}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar texto
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsWhatsappDialogOpen(true)}>
              Compartir por WhatsApp
            </Button>
            <Button type="button" onClick={() => setIsEmailDialogOpen(true)}>
              Compartir por e-mail
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WhatsappShareDialog
        open={isWhatsappDialogOpen}
        onOpenChange={setIsWhatsappDialogOpen}
        isSharing={isSharingWhatsapp}
        onConfirm={handleShareWhatsapp}
        title="Compartir datos bancarios por WhatsApp"
        phoneFieldId="transfer-whatsapp-phone"
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
        fieldPrefix="transfer-share"
      />
    </>
  );
}
