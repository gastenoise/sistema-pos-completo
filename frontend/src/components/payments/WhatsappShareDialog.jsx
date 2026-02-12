import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import WhatsappPhoneField, { normalizeWhatsappNumber } from './WhatsappPhoneField';

export default function WhatsappShareDialog({
  open,
  onOpenChange,
  isSharing,
  onConfirm,
  title = 'Compartir por WhatsApp',
  submitLabel = 'Abrir WhatsApp',
  phoneFieldId = 'whatsapp-phone',
}) {
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <WhatsappPhoneField
            id={phoneFieldId}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={isSharing}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSharing}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSharing || normalizedPhone.length < 8}>
              {isSharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
