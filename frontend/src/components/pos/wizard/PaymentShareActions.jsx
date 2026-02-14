import React, { useState } from 'react';
import { ChevronDown, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import EmailShareDialog from '@/components/payments/EmailShareDialog';
import WhatsappShareDialog from '@/components/payments/WhatsappShareDialog';
import { sanitizeEmailAddress, sanitizePhoneNumber } from '@/lib/sanitize';

export default function PaymentShareActions({
  shareText,
  whatsappTitle,
  emailTitle,
  defaultSubject,
  defaultMessage,
  phoneFieldId,
  fieldPrefix,
}) {
  const [isWhatsappDialogOpen, setIsWhatsappDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSharingWhatsapp, setIsSharingWhatsapp] = useState(false);
  const [isSharingEmail, setIsSharingEmail] = useState(false);

  const handleShareWhatsapp = async (phoneNumber) => {
    if (!phoneNumber) return;

    try {
      setIsSharingWhatsapp(true);
      const safePhoneNumber = sanitizePhoneNumber(phoneNumber);
      if (!safePhoneNumber) return;

      const whatsappUrl = `https://wa.me/${safePhoneNumber}?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      setIsWhatsappDialogOpen(false);
      toast.success('WhatsApp abierto con la información lista para enviar.');
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

      const finalSubject = subject?.trim() || defaultSubject;
      const bodyParts = [];
      if (message?.trim()) {
        bodyParts.push(message.trim(), '');
      }
      bodyParts.push(shareText);

      const mailtoUrl = `mailto:${encodeURIComponent(safeEmail)}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(bodyParts.join('\n'))}`;
      window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
      setIsEmailDialogOpen(false);
      toast.success('Cliente de correo abierto con la información.');
    } catch (error) {
      toast.error(error?.message || 'No se pudo abrir el cliente de correo.');
    } finally {
      setIsSharingEmail(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="outline">
            Compartir
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsWhatsappDialogOpen(true)}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Enviar por WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsEmailDialogOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Enviar por e-mail
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WhatsappShareDialog
        open={isWhatsappDialogOpen}
        onOpenChange={setIsWhatsappDialogOpen}
        isSharing={isSharingWhatsapp}
        onConfirm={handleShareWhatsapp}
        title={whatsappTitle}
        phoneFieldId={phoneFieldId}
      />

      <EmailShareDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        isSending={isSharingEmail}
        onSend={handleShareEmail}
        defaultSubject={defaultSubject}
        defaultMessage={defaultMessage}
        title={emailTitle}
        submitLabel="Abrir e-mail"
        fieldPrefix={fieldPrefix}
      />
    </>
  );
}
