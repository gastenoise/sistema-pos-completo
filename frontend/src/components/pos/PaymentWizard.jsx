import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import DivisionStep from './wizard/DivisionStep';
import ProcessStep from './wizard/ProcessStep';
import { sumToCents, toCents } from '@/lib/money';

export default function PaymentWizard({
  open,
  onClose,
  total,
  businessData,
  bankAccountData,
  paymentMethods,
  onInitializeSale,
  onConfirmPayment,
  onComplete
}) {
  const [step, setStep] = useState(1); // 1: division, 2: process
  const [saleId, setSaleId] = useState(null);
  const [paymentsDraft, setPaymentsDraft] = useState([]);
  const [persistedPayments, setPersistedPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && paymentMethods.length > 0) {
      const defaultMethod = paymentMethods.find((m) => m.is_default) || paymentMethods[0];
      setPaymentsDraft([
        {
          id: Date.now(),
          method: defaultMethod,
          amount: total
        }
      ]);
      setPersistedPayments([]);
      setSaleId(null);
      setStep(1);
    }
  }, [open, total, paymentMethods]);

  const handleAddPayment = (method) => {
    setPaymentsDraft([
      ...paymentsDraft,
      {
        id: Date.now(),
        method,
        amount: 0
      }
    ]);
  };

  const handleRemovePayment = (id) => {
    setPaymentsDraft(paymentsDraft.filter((p) => p.id !== id));
  };

  const handleChangeMethod = (id, method) => {
    setPaymentsDraft(paymentsDraft.map((p) => (p.id === id ? { ...p, method } : p)));
  };

  const handleChangeAmount = (id, amount) => {
    setPaymentsDraft(paymentsDraft.map((p) => (p.id === id ? { ...p, amount: Number(amount) || 0 } : p)));
  };

  const handleConfirmDivision = async () => {
    setLoading(true);
    try {
      const initialized = await onInitializeSale(paymentsDraft);
      setSaleId(initialized.saleId);
      setPersistedPayments(initialized.payments);
      setStep(2);
    } catch (error) {
      toast.error(error?.message || 'Failed to save payment division');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDivision = () => {
    toast.error('Payment division cannot be edited after sale initialization');
  };

  const handleUpdatePaymentStatus = async (paymentId, status, reference = null) => {
    if (!saleId) {
      toast.error('Sale is not initialized');
      return;
    }

    try {
      const updatedPayment = await onConfirmPayment({
        saleId,
        paymentId,
        status,
        reference
      });

      setPersistedPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, ...updatedPayment } : p)));
    } catch (error) {
      toast.error(error?.message || 'Failed to update payment status');
    }
  };

  const handleCloseSale = async () => {
    if (!saleId) {
      toast.error('Sale is not initialized');
      return;
    }

    setLoading(true);
    try {
      await onComplete({ saleId });
      toast.success('Sale completed successfully!');
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Failed to close sale');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPaymentsDraft([]);
    setPersistedPayments([]);
    setSaleId(null);
    setStep(1);
    onClose();
  };

  const totalDraftCents = sumToCents(paymentsDraft.map((p) => p.amount || 0));
  const totalCents = toCents(total);
  const isValidDivision = totalDraftCents === totalCents;
  const allConfirmed = persistedPayments.length > 0 && persistedPayments.every((p) => p.status === 'confirmed');

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === 1 ? 'División del Pago' : 'Confirmación de pagos'}</DialogTitle>
          <DialogDescription className="sr-only">
            {step === 1
              ? 'Split the sale into one or more payment methods.'
              : 'Confirm each payment and close the sale.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <DivisionStep
            total={total}
            paymentsDraft={paymentsDraft}
            paymentMethods={paymentMethods}
            onAddPayment={handleAddPayment}
            onRemovePayment={handleRemovePayment}
            onChangeMethod={handleChangeMethod}
            onChangeAmount={handleChangeAmount}
          />
        ) : (
          <ProcessStep
            payments={persistedPayments}
            businessData={businessData}
            bankAccountData={bankAccountData}
            onUpdateStatus={handleUpdatePaymentStatus}
            onBackToDivision={handleBackToDivision}
          />
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>

          {step === 1 ? (
            <Button onClick={handleConfirmDivision} disabled={!isValidDivision || loading || paymentsDraft.length === 0}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Division
            </Button>
          ) : (
            <Button onClick={handleCloseSale} disabled={!allConfirmed || loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Close Sale
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
