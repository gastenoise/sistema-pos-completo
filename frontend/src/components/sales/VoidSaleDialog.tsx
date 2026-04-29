import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/api/client';
import { TOAST_MESSAGES } from '@/lib/toastMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface VoidSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | number;
  onVoided?: (saleId: string | number) => Promise<void> | void;
}

export default function VoidSaleDialog({
  open,
  onOpenChange,
  saleId,
  onVoided,
}: VoidSaleDialogProps) {
  const [reason, setReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.error('Por favor ingrese el motivo de cancelación');
      return;
    }

    setIsVoiding(true);
    try {
      await apiClient.post(`/protected/sales/${saleId}/void`, { reason: reason.trim() });
      toast.success(TOAST_MESSAGES.sales.cancelSuccess);
      await onVoided?.(saleId);
      setReason('');
      onOpenChange(false);
    } catch (error) {
      toast.error(error?.message || TOAST_MESSAGES.sales.cancelError);
    } finally {
      setIsVoiding(false);
    }
  };

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancelar venta</DialogTitle>
          <DialogDescription>
            Ingrese el motivo para anular esta venta. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-2">
          <label htmlFor="reason" className="text-sm font-medium">
            Motivo de cancelación
          </label>
          <Input
            id="reason"
            type="text"
            placeholder="Ej: Error en el precio, cliente se arrepintió..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && reason.trim()) {
                handleConfirm();
              }
            }}
            disabled={isVoiding}
            autoFocus
          />
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isVoiding}
            className="w-full sm:w-auto"
          >
            Atrás
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!reason.trim() || isVoiding}
            className="w-full sm:w-auto"
          >
            {isVoiding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Siguiente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
