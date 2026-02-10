import React, { useMemo, useState } from 'react';
import { Download, Loader2, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  downloadSaleTicketPdf,
  getSaleTicketWhatsappShare,
  sendSaleTicketEmail,
} from '@/api/salesTickets';

const resolveErrorMessage = (error, fallbackMessage) => {
  return error?.message || error?.data?.message || fallbackMessage;
};

const notifyTicketActionError = (fallbackMessage, error) => {
  toast.error(resolveErrorMessage(error, fallbackMessage));
};

const notifyTicketActionSuccess = (message) => {
  toast.success(message);
};

export function TicketEmailDialog({
  open,
  onOpenChange,
  defaultEmail,
  defaultSubject,
  defaultMessage,
  isSending,
  onSend,
}) {
  const [form, setForm] = useState({
    to_email: defaultEmail || '',
    subject: defaultSubject || 'Tu ticket de compra',
    message: defaultMessage || 'Gracias por tu compra. Te compartimos el comprobante adjunto.',
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        to_email: defaultEmail || '',
        subject: defaultSubject || 'Tu ticket de compra',
        message: defaultMessage || 'Gracias por tu compra. Te compartimos el comprobante adjunto.',
      });
    }
  }, [open, defaultEmail, defaultSubject, defaultMessage]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSend(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar ticket por e-mail</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-email-to">Destinatario</Label>
            <Input
              id="ticket-email-to"
              type="email"
              value={form.to_email}
              onChange={(e) => setForm((prev) => ({ ...prev, to_email: e.target.value }))}
              placeholder="cliente@ejemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-email-subject">Asunto</Label>
            <Input
              id="ticket-email-subject"
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Tu ticket de compra"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-email-message">Mensaje</Label>
            <textarea
              id="ticket-email-message"
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              rows={4}
              className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder="Mensaje opcional"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSending || !form.to_email.trim()}>
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar e-mail
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TicketActions({ saleId, customerEmail, className = '' }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingWhatsapp, setIsLoadingWhatsapp] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const isDisabled = !saleId;

  const defaultEmail = useMemo(() => customerEmail || '', [customerEmail]);

  const handleDownloadPdf = async () => {
    if (!saleId || isDownloading) return;

    try {
      setIsDownloading(true);
      const { blob, fileName } = await downloadSaleTicketPdf(saleId);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);
      notifyTicketActionSuccess('Ticket PDF descargado correctamente.');
    } catch (error) {
      notifyTicketActionError('No se pudo descargar el PDF del ticket.', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWhatsapp = async () => {
    if (!saleId || isLoadingWhatsapp) return;

    try {
      setIsLoadingWhatsapp(true);
      const payload = await getSaleTicketWhatsappShare(saleId);
      const whatsappUrl = payload?.whatsapp_url;

      if (!whatsappUrl) {
        throw new Error('No se pudo obtener el enlace de WhatsApp.');
      }

      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      notifyTicketActionSuccess('Enlace de WhatsApp generado.');
    } catch (error) {
      notifyTicketActionError('No se pudo preparar el ticket para WhatsApp.', error);
    } finally {
      setIsLoadingWhatsapp(false);
    }
  };

  const handleSendEmail = async (formPayload) => {
    if (!saleId) return;

    try {
      setIsSendingEmail(true);
      const response = await sendSaleTicketEmail(saleId, {
        to_email: formPayload.to_email.trim(),
        subject: formPayload.subject?.trim() || undefined,
        message: formPayload.message?.trim() || undefined,
      });

      notifyTicketActionSuccess(response?.message || 'Ticket enviado correctamente por e-mail.');
      setIsEmailDialogOpen(false);
    } catch (error) {
      notifyTicketActionError('No se pudo enviar el ticket por e-mail.', error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
        <Button type="button" variant="outline" onClick={handleDownloadPdf} disabled={isDisabled || isDownloading}>
          {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Descargar PDF
        </Button>
        <Button type="button" variant="outline" onClick={handleShareWhatsapp} disabled={isDisabled || isLoadingWhatsapp}>
          {isLoadingWhatsapp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
          Enviar por WhatsApp
        </Button>
        <Button type="button" onClick={() => setIsEmailDialogOpen(true)} disabled={isDisabled || isSendingEmail}>
          <Mail className="mr-2 h-4 w-4" />
          Enviar por e-mail
        </Button>
      </div>

      <TicketEmailDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        defaultEmail={defaultEmail}
        isSending={isSendingEmail}
        onSend={handleSendEmail}
      />
    </>
  );
}
