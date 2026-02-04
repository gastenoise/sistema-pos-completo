import React, { useState } from 'react';
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
  showWarning = false
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Open Cash Register
          </DialogTitle>
          {showWarning && (
            <DialogDescription className="text-amber-600">
              The cash register is closed. Open it to process sales.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="opening_amount">Opening Cash Amount</Label>
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
              Enter the starting cash amount in the register
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Open Register
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}