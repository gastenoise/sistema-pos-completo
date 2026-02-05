import React, { useState } from 'react';
import { 
  CheckCircle2, Loader2, QrCode, Mail, MessageCircle, 
  Building, CreditCard, Banknote, ArrowRight, Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useBusiness } from './BusinessContext';
import { formatPrice } from '@/lib/formatPrice';

export default function PaymentWizard({ 
  open, 
  onClose, 
  payments = [],
  businessData,
  bankAccountData,
  onComplete
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [confirmedSteps, setConfirmedSteps] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const { currentBusiness } = useBusiness();

  if (!payments || payments.length === 0) return null;

  const currentPayment = payments[currentStep];
  const totalSteps = payments.length;
  const progress = ((currentStep + (confirmedSteps.includes(currentStep) ? 1 : 0)) / totalSteps) * 100;

  const handleConfirmStep = async () => {
    setConfirmedSteps([...confirmedSteps, currentStep]);
    
    // Move to next step or complete
    if (currentStep < totalSteps - 1) {
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 500);
    } else {
      // Last step - process sale
      setProcessing(true);
      try {
        await onComplete();
        setCompleted(true);
      } catch (error) {
        setProcessing(false);
      }
    }
  };

  const renderCashFlow = () => (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <Banknote className="w-16 h-16 mx-auto mb-3 text-green-600" />
        <p className="text-2xl font-bold text-green-900 mb-1">{formatPrice(currentPayment.amount, currentBusiness)}</p>
        <p className="text-sm text-green-700">Cash Payment</p>
      </div>

      <Button 
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={handleConfirmStep}
        disabled={confirmedSteps.includes(currentStep)}
      >
        {confirmedSteps.includes(currentStep) ? (
          <>
            <Check className="w-5 h-5 mr-2" />
            Confirmed
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Confirm Cash Received
          </>
        )}
      </Button>
    </div>
  );

  const renderMercadoPagoFlow = () => (
    <div className="space-y-4">
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <QrCode className="w-5 h-5 text-sky-600" />
          <span className="font-medium text-sky-900">Mercado Pago QR</span>
        </div>
        
        <div className="bg-white p-4 rounded-lg text-center mb-3">
          <div className="w-48 h-48 mx-auto bg-slate-200 rounded-lg flex items-center justify-center">
            <QrCode className="w-24 h-24 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Scan to pay {formatPrice(currentPayment.amount, currentBusiness)}</p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(`https://wa.me/?text=Pay ${formatPrice(currentPayment.amount, currentBusiness)}`, '_blank')}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            WhatsApp
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(`mailto:?subject=Payment Request&body=Pay ${formatPrice(currentPayment.amount, currentBusiness)}`, '_blank')}
          >
            <Mail className="w-4 h-4 mr-1" />
            Email
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
        <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-amber-600" />
        <p className="text-sm text-amber-900">Waiting for Mercado Pago confirmation...</p>
        <p className="text-xs text-amber-700 mt-1">This step will auto-advance when payment is received</p>
      </div>
    </div>
  );

  const renderTransferFlow = () => (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building className="w-5 h-5 text-amber-600" />
          <span className="font-medium text-amber-900">Bank Transfer Details</span>
        </div>
        
        <div className="space-y-2 text-sm mb-3">
          <div className="flex justify-between">
            <span className="text-slate-600">Bank:</span>
            <span className="font-medium">{bankAccountData?.bank_name || 'Not configured'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Account:</span>
            <span className="font-medium">{bankAccountData?.account_number || 'Not configured'}</span>
          </div>
          {bankAccountData?.alias && (
            <div className="flex justify-between">
              <span className="text-slate-600">Alias:</span>
              <span className="font-medium">{bankAccountData.alias}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-600">CBU/CVU:</span>
            <span className="font-medium">{bankAccountData?.cbu_cvu || 'Not configured'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Holder:</span>
            <span className="font-medium">{bankAccountData?.account_holder || businessData?.name || 'Not configured'}</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="text-slate-600">Amount:</span>
            <span className="font-bold text-lg">{formatPrice(currentPayment.amount, currentBusiness)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(`https://wa.me/?text=Transfer ${formatPrice(currentPayment.amount, currentBusiness)}`, '_blank')}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            WhatsApp
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(`mailto:?subject=Transfer Details`, '_blank')}
          >
            <Mail className="w-4 h-4 mr-1" />
            Email
          </Button>
        </div>
      </div>

      <Button 
        className="w-full bg-amber-600 hover:bg-amber-700"
        onClick={handleConfirmStep}
        disabled={confirmedSteps.includes(currentStep)}
      >
        {confirmedSteps.includes(currentStep) ? (
          <>
            <Check className="w-5 h-5 mr-2" />
            Confirmed
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Confirm Transfer Received
          </>
        )}
      </Button>
    </div>
  );

  const renderDebitCreditFlow = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <CreditCard className="w-16 h-16 mx-auto mb-3 text-blue-600" />
        <p className="text-2xl font-bold text-blue-900 mb-1">{formatPrice(currentPayment.amount, currentBusiness)}</p>
        <p className="text-sm text-blue-700">{currentPayment.method?.name} Payment</p>
      </div>

      <Button 
        className="w-full bg-blue-600 hover:bg-blue-700"
        onClick={handleConfirmStep}
        disabled={confirmedSteps.includes(currentStep)}
      >
        {confirmedSteps.includes(currentStep) ? (
          <>
            <Check className="w-5 h-5 mr-2" />
            Confirmed
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Confirm Card Payment
          </>
        )}
      </Button>
    </div>
  );

  const renderContent = () => {
    if (completed) {
      return (
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-green-900 mb-1">Payment Successful!</h3>
            <p className="text-slate-600">Sale completed and recorded</p>
          </div>
          <Button 
            onClick={onClose}
            className="bg-green-600 hover:bg-green-700"
          >
            Close
          </Button>
        </div>
      );
    }

    if (!currentPayment) return null;

    switch (currentPayment.method?.type) {
      case 'mercado_pago':
        return renderMercadoPagoFlow();
      case 'transfer':
        return renderTransferFlow();
      case 'cash':
        return renderCashFlow();
      case 'debit':
      case 'credit':
        return renderDebitCreditFlow();
      default:
        return renderCashFlow();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
        </DialogHeader>

        {!completed && (
          <>
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Step {currentStep + 1} of {totalSteps}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2">
              {payments.map((payment, idx) => (
                <div key={idx} className="flex items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      confirmedSteps.includes(idx) 
                        ? 'bg-green-500 text-white' 
                        : idx === currentStep 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {confirmedSteps.includes(idx) ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  {idx < payments.length - 1 && (
                    <div className={`w-8 h-0.5 ${confirmedSteps.includes(idx) ? 'bg-green-500' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Payment Method Label */}
            <div className="text-center">
              <p className="text-sm text-slate-500">Payment Method</p>
              <p className="text-lg font-bold capitalize">{currentPayment.method?.name}</p>
            </div>
          </>
        )}

        {/* Content */}
        {processing && !completed ? (
          <div className="py-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
            <p className="text-slate-600">Processing sale...</p>
          </div>
        ) : (
          renderContent()
        )}
      </DialogContent>
    </Dialog>
  );
}
