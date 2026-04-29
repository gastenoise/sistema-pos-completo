import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { formatPrice } from '@/lib/formatPrice';
import { formatDateTimeLocal, parseBackendDateToUtcDate } from '@/lib/dateTime';
import { getSaleStatusLabel } from '@/lib/saleStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import TicketActions from '@/components/sales/TicketActions';
import VoidSaleDialog from '@/components/sales/VoidSaleDialog';


const getSalePaymentBreakdown = (sale, paymentMethodLookup = {}) => {
  const payments = Array.isArray(sale?.payments) ? sale.payments : [];

  if (payments.length === 0) {
    const fallbackCode = sale?.payment_method_type;
    if (!fallbackCode) return [];
    const fallbackMethod = paymentMethodLookup[fallbackCode] || {};
    return [{
      code: fallbackCode,
      name: fallbackMethod.name || fallbackCode,
      amount: parseFloat(sale?.total_amount ?? sale?.total ?? 0) || 0,
    }];
  }

  return payments.map((payment) => {
    const code = payment.payment_method_code
      || payment.code
      || payment.type
      || payment.paymentMethod?.code
      || payment.payment_method?.code
      || 'unknown';
    const method = paymentMethodLookup[code] || payment.paymentMethod || payment.payment_method || {};
    return {
      code,
      name: method.name || code,
      amount: parseFloat(payment.amount) || 0,
    };
  });
};

const getSaleItemCategoryName = (item) => {
  return item?.category_name
    ?? item?.category_name_snapshot
    ?? item?.category_snapshot?.name
    ?? item?.categorySnapshot?.name
    ?? item?.item?.category?.name
    ?? 'Sin categoría';
};

export default function SaleDetailsDialog({
  open,
  onOpenChange,
  sale,
  currentBusiness,
  paymentMethodLookup = {},
  canVoid = false,
  onVoided,
}: any) {
  const [isVoiding, setIsVoiding] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const paymentBreakdown = useMemo(
    () => getSalePaymentBreakdown(sale, paymentMethodLookup),
    [sale, paymentMethodLookup]
  );
  const saleDate = useMemo(() => parseBackendDateToUtcDate(sale?.closed_at || sale?.created_at), [sale]);

  const handleVoidClick = () => {
    if (!sale?.id || !canVoid || sale?.status === 'voided') return;
    setShowVoidDialog(true);
  };

  const handleVoided = async (voidedSaleId: string | number) => {
    await onVoided?.(voidedSaleId);
    setShowVoidDialog(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full md:w-auto h-[100dvh] md:h-auto max-h-[100dvh] md:max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Detalle de venta</DialogTitle>
        </DialogHeader>
        {sale && (
          <div className="flex flex-col h-full">
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-slate-500">Fecha</p>
                  <p className="font-medium">{saleDate ? formatDateTimeLocal(saleDate, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Estado</p>
                  <Badge
                    variant={sale.status === 'closed' ? 'default' : 'secondary'}
                    className={
                      sale.status === 'closed' ? 'bg-green-100 text-green-800' :
                      sale.status === 'voided' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }
                  >
                    {getSaleStatusLabel(sale.status)}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Items</h3>
                <div className="space-y-2">
                  {sale.items?.map((item, idx) => {
                    const quantity = item.quantity ?? 0;
                    const unitPrice = item.unit_price ?? item.unit_price_snapshot ?? item.price ?? 0;
                    const subtotal = item.subtotal ?? item.total ?? (quantity * unitPrice);
                    const name = item.name ?? item.item_name_snapshot ?? item.item?.name ?? 'Item';
                    const categoryName = getSaleItemCategoryName(item);
                    return (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-[11px] text-slate-400">Categoría: {categoryName}</p>
                          <p className="text-sm text-slate-500">{quantity} × {formatPrice(unitPrice, currentBusiness)}</p>
                        </div>
                        <p className="font-medium">{formatPrice(subtotal, currentBusiness)}</p>
                      </div>
                    );
                  }) || <p className="text-slate-400 text-sm">No items</p>}
                </div>
              </div>

              <div>
              {/* className="pt-4 border-t" */}
                {/* <h3 className="font-medium mb-3">Payment Details</h3> */}
                <div className="space-y-2">
                  {(() => {
                    const subtotal = sale.subtotal ?? sale.total_amount ?? 0;
                    const total = sale.total_amount ?? sale.total ?? 0;
                    return subtotal !== total ? (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="font-medium">{formatPrice(subtotal, currentBusiness)}</span>
                      </div>
                    ) : null;
                  })()}
                  {sale.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tax</span>
                      <span className="font-medium">{formatPrice(sale.tax, currentBusiness)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-lg">{formatPrice(sale.total_amount ?? sale.total ?? 0, currentBusiness)}</span>
                  </div>
                  <div className="space-y-2 pt-2">
                    <span className="text-slate-600">Forma de pago</span>
                    <div className="space-y-2">
                      {paymentBreakdown.map((payment, idx) => (
                        <div key={`${payment.code}-${idx}`} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                          <Badge variant="outline" className="capitalize">
                            {payment.name}
                          </Badge>
                          <span className="font-medium">{formatPrice(payment.amount, currentBusiness)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {sale.payment_reference && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Reference</span>
                      <span className="font-mono text-sm">{sale.payment_reference}</span>
                    </div>
                  )}
                </div>
              </div>

              {sale.customer_name && (
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Customer</h3>
                  <p>{sale.customer_name}</p>
                  {sale.customer_email && (
                    <p className="text-sm text-slate-500">{sale.customer_email}</p>
                  )}
                </div>
              )}

              <div className="pt-2">
                {/* <h3 className="font-medium mb-1">Ticket</h3>
                <p className="text-xs text-slate-500 mb-2">Abre la vista previa para descargar o compartir el ticket.</p> */}
                <TicketActions
                  saleId={sale.id}
                  customerEmail={sale.customer_email}
                  rightActions={canVoid && sale.status !== 'voided' && (
                    <Button
                      variant="destructive"
                      onClick={handleVoidClick}
                      disabled={isVoiding}
                      className="w-full sm:w-auto"
                    >
                      {isVoiding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Cancelar venta
                    </Button>
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
      <VoidSaleDialog
        open={showVoidDialog}
        onOpenChange={setShowVoidDialog}
        saleId={sale?.id}
        onVoided={handleVoided}
      />
    </Dialog>
  );
}
