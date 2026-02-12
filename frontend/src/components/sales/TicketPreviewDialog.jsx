import React, { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Download, Loader2, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSaleTicket, getSaleTicketEmailStatus, sendSaleTicketEmail } from '@/api/salesTickets';
import { downloadTicketPdfFromNode, generateTicketFileName, generateTicketPdfBlobFromNode } from '@/utils/ticketPdf';
import { useBusiness } from '@/components/pos/BusinessContext';

const DEFAULT_DATE_LOCALE = 'es-AR';

const getUserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const formatTicketDateTimeLocal = (value, options = {}) => {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '-';
  }

  return new Intl.DateTimeFormat(DEFAULT_DATE_LOCALE, {
    timeZone: getUserTimeZone(),
    ...options,
  }).format(date);
};

const formatTicketDatePartsLocal = (value) => {
  const defaultParts = { date: '-', time: '-' };
  if (!value) return defaultParts;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return defaultParts;
  }

  return {
    date: formatTicketDateTimeLocal(date, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    time: formatTicketDateTimeLocal(date, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  };
};

const resolveErrorMessage = (error, fallbackMessage) => {
  return error?.message || error?.data?.message || fallbackMessage;
};

const notifyTicketActionError = (fallbackMessage, error) => {
  toast.error(resolveErrorMessage(error, fallbackMessage));
};

const notifyTicketActionSuccess = (message) => {
  toast.success(message);
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount);
};

const normalizeWhatsappNumber = (rawValue) => {
  if (!rawValue) return '';
  return rawValue.replace(/[^\d]/g, '');
};

const buildWhatsappTicketText = (ticket, saleId) => {
  const businessName = ticket?.business?.name || 'Negocio';
  const ticketNumber = ticket?.id || saleId;
  const ticketDate = formatTicketDateTimeLocal(ticket?.date?.closed_at || ticket?.date?.created_at, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const seller = ticket?.seller?.name || '-';
  const lines = [
    `${businessName} te comparte tu ticket.`,
    `Ticket: #${ticketNumber}`,
    `Fecha: ${ticketDate}`,
    `Vendedor: ${seller}`,
    '',
    'Detalle:',
  ];

  if (Array.isArray(ticket?.items) && ticket.items.length > 0) {
    ticket.items.forEach((item) => {
      lines.push(`- ${item.quantity} x ${item.name}: ${formatCurrency(item.total)}`);
    });
  } else {
    lines.push('- Sin ítems');
  }

  lines.push('', `Total: ${formatCurrency(ticket?.total?.amount)}`);

  return lines.join('\n');
};

function TicketEmailDialog({
  open,
  onOpenChange,
  defaultEmail,
  defaultSubject,
  defaultMessage,
  isSending,
  onSend,
  smtpMessage,
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

          {smtpMessage && (
            <p className="text-xs text-amber-700">{smtpMessage}</p>
          )}

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

function TicketWhatsappDialog({ open, onOpenChange, isSharing, onConfirm }) {
  const [phone, setPhone] = useState('');

  React.useEffect(() => {
    if (open) {
      setPhone('');
    }
  }, [open]);

  const normalizedPhone = normalizeWhatsappNumber(phone);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onConfirm(normalizedPhone);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir ticket por WhatsApp</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-whatsapp-phone">Número (con código de país)</Label>
            <Input
              id="ticket-whatsapp-phone"
              inputMode="tel"
              placeholder="5491122334455"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
            <p className="text-xs text-slate-500">Solo números. Ejemplo: 5491122334455.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSharing}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSharing || normalizedPhone.length < 8}>
              {isSharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Abrir WhatsApp
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TicketPreviewDialog({ open, onOpenChange, saleId, customerEmail }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingWhatsapp, setIsLoadingWhatsapp] = useState(false);
  const [isWhatsappDialogOpen, setIsWhatsappDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const ticketContentRef = useRef(null);
  const { smtpStatus, isCheckingSmtpStatus } = useBusiness();
  const isSmtpValid = smtpStatus?.is_valid === true;

  const defaultEmail = useMemo(() => customerEmail || '', [customerEmail]);

  const { data: ticket, isLoading, isError, error } = useQuery({
    queryKey: ['sale-ticket', saleId],
    queryFn: async () => getSaleTicket(saleId),
    enabled: open && !!saleId,
  });

  const handleDownloadPdf = async () => {
    if (!saleId || isDownloading) return;

    try {
      setIsDownloading(true);
      await downloadTicketPdfFromNode({
        saleId,
        ticketNode: ticketContentRef.current,
      });
      notifyTicketActionSuccess('Ticket PDF descargado correctamente.');
    } catch (downloadError) {
      notifyTicketActionError('No se pudo descargar el PDF del ticket.', downloadError);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWhatsapp = async (phoneNumber) => {
    if (!saleId || isLoadingWhatsapp || !phoneNumber) return;

    try {
      setIsLoadingWhatsapp(true);

      const shareText = buildWhatsappTicketText(ticket, saleId);
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(shareText)}`;

      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      setIsWhatsappDialogOpen(false);
      notifyTicketActionSuccess('WhatsApp abierto con el ticket listo para enviar.');
    } catch (shareError) {
      notifyTicketActionError('No se pudo abrir WhatsApp.', shareError);
    } finally {
      setIsLoadingWhatsapp(false);
    }
  };

  const pollEmailDeliveryStatus = async ({ requestId, toEmail }) => {
    const maxAttempts = 30;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const statusResponse = await getSaleTicketEmailStatus(saleId, requestId);
        const currentStatus = statusResponse?.status;

        if (currentStatus === 'sent') {
          notifyTicketActionSuccess(`Ticket enviado correctamente a ${statusResponse?.to_email || toEmail}.`);
          return;
        }

        if (currentStatus === 'failed') {
          notifyTicketActionError(statusResponse?.error_message || 'No se pudo enviar el ticket por e-mail.');
          return;
        }
      } catch (statusError) {
        if (attempt === maxAttempts - 1) {
          notifyTicketActionError('No se pudo confirmar el estado del envío de e-mail.', statusError);
        }
      }
    }
  };

  const handleSendEmail = async (formPayload) => {
    if (!saleId || isSendingEmail) return;

    if (!isSmtpValid) {
      notifyTicketActionError(smtpStatus?.message || 'Configurá un SMTP activo para habilitar el envío por e-mail.');
      return;
    }

    try {
      setIsSendingEmail(true);
      const pdfBlob = await generateTicketPdfBlobFromNode({
        saleId,
        ticketNode: ticketContentRef.current,
      });

      const formData = new FormData();
      formData.append('to_email', formPayload.to_email.trim());

      const subject = formPayload.subject?.trim();
      if (subject) {
        formData.append('subject', subject);
      }

      const message = formPayload.message?.trim();
      if (message) {
        formData.append('message', message);
      }

      formData.append('ticket_pdf', new File([pdfBlob], generateTicketFileName(saleId), { type: 'application/pdf' }));

      const response = await sendSaleTicketEmail(saleId, formData);
      const requestId = response?.request_id;
      const toEmail = response?.to_email || formPayload.to_email.trim();

      notifyTicketActionSuccess(response?.message || 'El correo quedó en cola y se enviará en segundo plano.');
      setIsEmailDialogOpen(false);

      if (requestId) {
        pollEmailDeliveryStatus({ requestId, toEmail });
      }
    } catch (sendError) {
      notifyTicketActionError('No se pudo enviar el ticket por e-mail.', sendError);
    } finally {
      setIsSendingEmail(false);
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vista previa del ticket</DialogTitle>
          </DialogHeader>

          <div
            ref={ticketContentRef}
            className="mx-auto w-full max-w-[340px] rounded-md border bg-white p-4 text-slate-900 shadow-sm"
          >
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando ticket...
              </div>
            )}

            {isError && (
              <p className="text-sm text-red-600">{resolveErrorMessage(error, 'No se pudo cargar el ticket.')}</p>
            )}

            {!isLoading && !isError && ticket && (
              <div className="space-y-4 font-mono text-xs">
                <div className="text-center">
                  <p className="font-semibold uppercase">{ticket?.business?.name || 'Negocio'}</p>
                  {ticket?.business?.address && <p>{ticket.business.address}</p>}
                  {ticket?.business?.phone && <p>Tel: {ticket.business.phone}</p>}
                  {ticket?.business?.tax_id && <p>CUIT: {ticket.business.tax_id}</p>}
                </div>

                <div className="border-t border-b border-dashed pb-3 space-y-1">
                  <p><strong>Ticket #{ticket?.id || saleId}</strong></p>
                  <div className="flex justify-between">
                    <span className="text-left">
                      Fecha: {formatTicketDatePartsLocal(ticket?.date?.closed_at || ticket?.date?.created_at).date}
                    </span>
                    <span className="text-right">
                      Hora: {formatTicketDatePartsLocal(ticket?.date?.closed_at || ticket?.date?.created_at).time}
                    </span>
                  </div>
                  <p>Vendedor: {(ticket?.seller?.name?.split(' ')[0]) || '-'}</p>
                </div>

                <div className="space-y-1">
                  {Array.isArray(ticket?.items) && ticket.items.length > 0 ? (
                    ticket.items.map((item) => (
                      <div key={item.id} className="space-y-1  pb-1">
                        <p className="font-semibold">{item.name}</p>
                        <div className="flex justify-between">
                          <span>
                            {item.quantity} x {formatCurrency(item.unit_price)}
                          </span>
                          <span>{formatCurrency(item.total)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>Sin ítems.</p>
                  )}
                </div>

                <div className="border-t border-dashed pt-2 space-y-1">
                  {Array.isArray(ticket?.payments) && ticket.payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between">
                      <span>{payment.method || 'Pago'}</span>
                      <span>{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between border-t pt-2 text-sm font-bold">
                  <span>TOTAL</span>
                  <span>{formatCurrency(ticket?.total?.amount)}</span>
                </div>

                <div className="pt-4">
                  <strong className="text-center block text-neutral-800 uppercase">Gracias por su compra</strong>
                  <p className="text-center text-[10px] mt-2 text-neutral-800">
                    Comprobante no válido como factura.<br />Sin validez fiscal.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleDownloadPdf} disabled={!saleId || isDownloading}>
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Descargar PDF
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" disabled={!saleId || isLoadingWhatsapp || isSendingEmail || isCheckingSmtpStatus}>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Compartir
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsWhatsappDialogOpen(true)}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Enviar por WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEmailDialogOpen(true)} disabled={!isSmtpValid}>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar por e-mail
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogContent>
      </Dialog>

      <TicketWhatsappDialog
        open={isWhatsappDialogOpen}
        onOpenChange={setIsWhatsappDialogOpen}
        isSharing={isLoadingWhatsapp}
        onConfirm={handleShareWhatsapp}
      />

      <TicketEmailDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        defaultEmail={defaultEmail}
        isSending={isSendingEmail || isCheckingSmtpStatus || !isSmtpValid}
        onSend={handleSendEmail}
        smtpMessage={!isSmtpValid ? (smtpStatus?.message || 'Configurá un SMTP activo para enviar correos.') : ''}
      />
    </>
  );
}
