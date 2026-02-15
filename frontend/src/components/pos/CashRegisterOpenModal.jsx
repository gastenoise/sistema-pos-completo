import React, { useEffect, useState } from 'react';
import { DollarSign, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function CashRegisterOpenModal({ 
  open, 
  onClose, 
  onConfirm,
  loading = false,
  title = 'Apertura de Caja',
  description="Ingresá el monto inicial que tenés en caja",
  warningMessage = null,
  cancelLabel = 'Cancelar',
  confirmLabel = 'Abrir Caja'
}) {
  const [openingAmount, setOpeningAmount] = useState('');

  const handleConfirm = () => {
    const amount = parseFloat(openingAmount) || 0;
    onConfirm(amount);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleConfirm();
    }
  };

  useEffect(() => {
    if (!open) {
      setOpeningAmount('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {title}
          </DialogTitle>
          {warningMessage && (
            <DialogDescription className="text-amber-600">
              {warningMessage}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="opening_amount">Monto de apertura</Label>
            <Input
              id="opening_amount"
              type="number"
              step="0.01"
              min="0"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-1">
              {description}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button 
              className="flex-1"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
