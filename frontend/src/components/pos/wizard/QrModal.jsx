import React from 'react';
import { QrCode, Copy, MessageCircle, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function QrModal({ open, onClose, amount, onConfirm }) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('https://mercadopago.com/example-qr');
    toast.success('Link copied to clipboard');
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=Pay ${formatPrice(amount)} via MercadoPago`, '_blank');
  };

  const handleEmail = () => {
    window.open(`mailto:?subject=Payment Request&body=Pay ${formatPrice(amount)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mercado Pago QR Code</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Display */}
          <div className="bg-white p-6 rounded-lg border-2 border-sky-200">
            <div className="w-64 h-64 mx-auto bg-slate-100 rounded-lg flex items-center justify-center">
              <QrCode className="w-32 h-32 text-slate-400" />
            </div>
            <p className="text-center mt-3 font-medium">
              Scan to pay {formatPrice(amount)}
            </p>
          </div>

          {/* Share Options */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={handleWhatsApp}>
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>

          {/* Confirm Button */}
          <Button 
            onClick={onConfirm}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Confirm Payment Received
          </Button>

          <p className="text-xs text-center text-slate-500">
            In production, this would auto-confirm via webhook
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}