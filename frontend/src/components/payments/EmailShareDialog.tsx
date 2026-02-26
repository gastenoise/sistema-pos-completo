import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function EmailShareDialog({
  open,
  onOpenChange,
  defaultEmail,
  defaultSubject,
  defaultMessage,
  isSending,
  onSend,
  helperMessage,
  title = 'Enviar por e-mail',
  submitLabel = 'Enviar e-mail',
  fieldPrefix = 'share',
}) {
  const [form, setForm] = useState({
    to_email: defaultEmail || '',
    subject: defaultSubject || '',
    message: defaultMessage || '',
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        to_email: defaultEmail || '',
        subject: defaultSubject || '',
        message: defaultMessage || '',
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${fieldPrefix}-email-to`}>Destinatario</Label>
            <Input
              id={`${fieldPrefix}-email-to`}
              type="email"
              value={form.to_email}
              onChange={(e) => setForm((prev) => ({ ...prev, to_email: e.target.value }))}
              placeholder="cliente@ejemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldPrefix}-email-subject`}>Asunto</Label>
            <Input
              id={`${fieldPrefix}-email-subject`}
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Asunto"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldPrefix}-email-message`}>Mensaje</Label>
            <textarea
              id={`${fieldPrefix}-email-message`}
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              rows={4}
              className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder="Mensaje opcional"
            />
          </div>

          {helperMessage && <p className="text-xs text-amber-700">{helperMessage}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSending || !form.to_email.trim()}>
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
