import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
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

export default function PaymentWizardNew({ 
  open, 
  onClose, 
  total,
  businessId,
  businessData,
  bankAccountData,
  paymentMethods,
  onComplete
}) {
  const [step, setStep] = useState(1); // 1: division, 2: process
  const [paymentsDraft, setPaymentsDraft] = useState([]);
  const [persistedPayments, setPersistedPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && paymentMethods.length > 0) {
      // Default: Efectivo with full amount
      const defaultMethod = paymentMethods.find(m => m.is_default) || paymentMethods[0];
      setPaymentsDraft([{
        id: Date.now(),
        method: defaultMethod,
        amount: total
      }]);
    }
  }, [open, total, paymentMethods]);

  const handleAddPayment = (method) => {
    setPaymentsDraft([...paymentsDraft, {
      id: Date.now(),
      method,
      amount: 0
    }]);
  };

  const handleRemovePayment = (id) => {
    setPaymentsDraft(paymentsDraft.filter(p => p.id !== id));
  };

  const handleChangeMethod = (id, method) => {
    setPaymentsDraft(paymentsDraft.map(p => 
      p.id === id ? { ...p, method } : p
    ));
  };

  const handleChangeAmount = (id, amount) => {
    setPaymentsDraft(paymentsDraft.map(p => 
      p.id === id ? { ...p, amount: parseFloat(amount) || 0 } : p
    ));
  };

  const handleConfirmDivision = async () => {
    setLoading(true);
    try {
      setPersistedPayments(
        paymentsDraft.map((payment) => ({
          id: payment.id,
          method: payment.method,
          amount: payment.amount,
          payment_method_id: payment.method.id,
          payment_method_type: payment.method.type,
          status: 'pending',
          payment_reference: null
        }))
      );
      setStep(2);
    } catch (error) {
      toast.error('Failed to save payment division');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDivision = () => {
    setStep(1);
    // Reset persisted if needed or just go back
  };

  const handleUpdatePaymentStatus = async (paymentId, status, reference = null) => {
    try {
      setPersistedPayments(persistedPayments.map(p =>
        p.id === paymentId ? { ...p, status, payment_reference: reference } : p
      ));
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };

  const handleCloseSale = async () => {
    setLoading(true);
    try {
      await onComplete(persistedPayments);
      toast.success('Sale completed successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to close sale');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // TODO: Delete persisted payments if any
    setPaymentsDraft([]);
    setPersistedPayments([]);
    setStep(1);
    onClose();
  };

  const totalDraft = paymentsDraft.reduce((sum, p) => sum + (p.amount || 0), 0);
  const isValidDivision = Math.abs(totalDraft - total) < 0.01;
  const allConfirmed = persistedPayments.every(p => p.status === 'confirmed');

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {step === 1 ? 'Divide Payment' : 'Process Payments'}
            </DialogTitle>
            <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
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

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          
          {step === 1 ? (
            <Button 
              onClick={handleConfirmDivision}
              disabled={!isValidDivision || loading || paymentsDraft.length === 0}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Division
            </Button>
          ) : (
            <Button 
              onClick={handleCloseSale}
              disabled={!allConfirmed || loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Close Sale
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
