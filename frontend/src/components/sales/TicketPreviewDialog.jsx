import React, { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getSaleTicket,
  getSaleTicketWhatsappShare,
  sendSaleTicketEmail,
  uploadSaleTicketWhatsappFile,
} from '@/api/salesTickets';
import { downloadTicketPdfFromNode, generateTicketFileName, generateTicketPdfBlobFromNode } from '@/utils/ticketPdf';

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

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-AR');
};

function TicketEmailDialog({
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

export default function TicketPreviewDialog({ open, onOpenChange, saleId, customerEmail }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingWhatsapp, setIsLoadingWhatsapp] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const ticketContentRef = useRef(null);

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

  const handleShareWhatsapp = async () => {
    if (!saleId || isLoadingWhatsapp) return;

    try {
      setIsLoadingWhatsapp(true);
      const pdfBlob = await generateTicketPdfBlobFromNode({
        saleId,
        ticketNode: ticketContentRef.current,
      });

      let uploadedFileUrl = null;

      try {
        const uploadResponse = await uploadSaleTicketWhatsappFile(
          saleId,
          new File([pdfBlob], generateTicketFileName(saleId), { type: 'application/pdf' }),
        );

        uploadedFileUrl = uploadResponse?.data?.file_url || uploadResponse?.file_url || null;
      } catch (uploadError) {
        notifyTicketActionError(
          'No se pudo subir el PDF. Se abrirá WhatsApp con solo texto (sin adjunto automático).',
          uploadError,
        );
      }

      const payload = await getSaleTicketWhatsappShare(saleId, {
        file_url: uploadedFileUrl || undefined,
      });
      const whatsappUrl = payload?.whatsapp_url;
      const capabilityNote = payload?.channel_notice;

      if (!whatsappUrl) {
        throw new Error('No se pudo obtener el enlace de WhatsApp.');
      }

      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      if (capabilityNote) {
        toast.message(capabilityNote);
      }

      notifyTicketActionSuccess('Enlace de WhatsApp generado.');
    } catch (shareError) {
      notifyTicketActionError('No se pudo preparar el ticket para WhatsApp.', shareError);
    } finally {
      setIsLoadingWhatsapp(false);
    }
  };

  const handleSendEmail = async (formPayload) => {
    if (!saleId) return;

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

      notifyTicketActionSuccess(response?.message || 'Ticket enviado correctamente por e-mail.');
      setIsEmailDialogOpen(false);
    } catch (sendError) {
      notifyTicketActionError('No se pudo enviar el ticket por e-mail.', sendError);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Vista previa del ticket</DialogTitle>
          </DialogHeader>

          <div ref={ticketContentRef} className="rounded-lg border bg-slate-50 p-4 text-sm max-h-[60vh] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-slate-500">
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
                      Fecha: {(() => {
                        const dateStr = ticket?.date?.closed_at || ticket?.date?.created_at;
                        if (!dateStr) return '-';
                        const date = new Date(dateStr);
                        if (Number.isNaN(date.getTime())) return '-';
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                      })()}
                    </span>
                    <span className="text-right">
                      Hora: {(() => {
                        const dateStr = ticket?.date?.closed_at || ticket?.date?.created_at;
                        if (!dateStr) return '-';
                        const date = new Date(dateStr);
                        if (Number.isNaN(date.getTime())) return '-';
                        // Mostrar en formato 24hs H:i:s
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        const seconds = String(date.getSeconds()).padStart(2, '0');
                        return `${hours}:${minutes}:${seconds}`;
                      })()}
                    </span>
                  </div>
                  <p>Vendedor: {(ticket?.seller?.name?.split(' ')[0]) || '-'}</p>
                  {/* <p>Caja: {ticket?.cash_register?.session_id || '-'}</p> */}
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

                {/* Mensaje de gracias y aclaración al pie */}
                <div className="pt-4">
                  <strong className="text-center block text-neutral-800 uppercase">Gracias por su compra</strong>
                  <p
                    className="text-center text-[10px] mt-2 text-neutral-800"
                  >
                    Comprobante no válido como factura.<br/>Sin validez fiscal.
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
            <Button type="button" variant="outline" onClick={handleShareWhatsapp} disabled={!saleId || isLoadingWhatsapp}>
              {isLoadingWhatsapp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
              Enviar por WhatsApp
            </Button>
            <Button type="button" onClick={() => setIsEmailDialogOpen(true)} disabled={!saleId || isSendingEmail}>
              <Mail className="mr-2 h-4 w-4" />
              Enviar por e-mail
            </Button>
          </div>
          {/* <p className="text-xs text-slate-500">
            WhatsApp Web/móvil no permite adjuntar archivos automáticamente desde <code>wa.me</code>. Se abrirá un mensaje
            con texto y, cuando esté disponible, un enlace al PDF para compartir manualmente.
          </p> */}
        </DialogContent>
      </Dialog>

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
