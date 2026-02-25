import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Lock, Unlock, Loader2, AlertCircle, CheckCircle, ChevronDown
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from 'sonner';
import { formatPrice } from '@/lib/formatPrice';
import { formatDateTimeLocal } from '@/lib/dateTime';
import { TOAST_MESSAGES } from '@/lib/toastMessages';

import { useBusiness } from '@/components/pos/BusinessContext';
import { useAuthorization } from '@/components/auth/AuthorizationContext';
import { useAuth } from '@/lib/AuthContext';
import TopNav from '@/components/pos/TopNav';
import CashRegisterOpenModal from '@/components/pos/CashRegisterOpenModal';
import {
  useCashStatusQuery,
  useClosedSessionsQuery,
  useExpectedTotalsQuery,
  useOpenRegisterMutation,
  useCloseRegisterMutation,
} from '@/modules/cash-register/hooks/useCashRegisterData';

export default function CashRegister() {
  const { businessId, currentBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { can } = useAuthorization();
  const canViewCashRegister = can('cash_register.view');
  
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [realCash, setRealCash] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecentSessions, setShowRecentSessions] = useState(false);

  const { data: currentSession, isLoading: loadingSession, isFetching: fetchingSession, refetch: refetchSession } = useCashStatusQuery(businessId, canViewCashRegister);

  const { data: recentSessions = [], isFetching: fetchingRecentSessions } = useClosedSessionsQuery(businessId, canViewCashRegister);

  const { data: expectedTotals, isFetching: fetchingExpectedTotals } = useExpectedTotalsQuery(currentSession?.id, canViewCashRegister);

  const openRegisterMutation = useOpenRegisterMutation();
  const closeRegisterMutation = useCloseRegisterMutation();

  // Calculate session totals by payment method
  const sessionTotals = {
    total: expectedTotals?.total_sales ?? 0,
    count: expectedTotals?.sales_count ?? 0
  };

  const paymentTotals = (expectedTotals?.breakdown || []).reduce((acc, total) => {
    const method = total.payment_method || total.paymentMethod;
    const methodKey = method?.code || total.payment_method_id;
    acc[methodKey] = Number(total.total ?? 0);
    return acc;
  }, {});

  const cashSales = (expectedTotals?.breakdown || []).reduce((acc, total) => {
    const method = total.payment_method || total.paymentMethod;
    const code = method?.code?.toLowerCase();
    const name = method?.name?.toLowerCase();
    if (code === 'cash' || name?.includes('efectivo')) {
      return acc + Number(total.total ?? 0);
    }
    return acc;
  }, 0);

  const paymentMovements = (expectedTotals?.breakdown || [])
    .map((total) => {
      const method = total.payment_method || total.paymentMethod;
      return {
        id: method?.id || total.payment_method_id,
        name: method?.name || 'Payment Method',
        code: method?.code || method?.type || total.payment_method_id,
        color: method?.color || '#6B7280',
        total: Number(total.total ?? 0)
      };
    })
    .filter((method) => method.total !== 0);

  const cashSalesTotal = expectedTotals?.cash_sales ?? cashSales;
  const expectedCash = expectedTotals?.expected_cash
    ?? (currentSession?.opening_cash_amount || 0) + cashSalesTotal;

  const handleOpenRegister = async (amount = null) => {
    setLoading(true);
    try {
      await openRegisterMutation.mutateAsync(amount);
      await refetchSession();
      setShowOpenDialog(false);
      toast.success(TOAST_MESSAGES.cashRegister.openSuccess);
    } catch (error) {
      toast.error(TOAST_MESSAGES.cashRegister.openError);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRegister = async () => {
    if (!currentSession) return;
    
    setLoading(true);
    try {
      const realCashAmount = parseFloat(realCash) || 0;
      await closeRegisterMutation.mutateAsync(realCashAmount);
      
      await refetchSession();
      queryClient.invalidateQueries({ queryKey: ['recentSessions', businessId] });
      setShowCloseDialog(false);
      setRealCash('');
      toast.success(TOAST_MESSAGES.cashRegister.closeSuccess);
    } catch (error) {
      toast.error(TOAST_MESSAGES.cashRegister.closeError);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const showCashOverlay = !loadingSession && (fetchingSession || fetchingRecentSessions || fetchingExpectedTotals || loading);

  if (!canViewCashRegister) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav user={user} onLogout={handleLogout} currentPage="Caja" />
        <div className="max-w-4xl mx-auto p-4 lg:p-6">
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-900">Acceso restringido</CardTitle>
              <CardDescription className="text-amber-800">
                No tenés permisos para ver ni operar la caja registradora.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav user={user} onLogout={handleLogout} currentPage="Caja" />
      
      <div className="max-w-4xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Caja Registradora</h1>
          <p className="text-slate-500">Gestioná tus aperturas y cierres de caja</p>
        </div>

        {loadingSession && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
        {!loadingSession && (
          <div className="relative">
            {showCashOverlay && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/50">
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando…
                </div>
              </div>
            )}
            {currentSession ? (
          /* Open Session View */
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Unlock className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-green-900">Caja abierta</CardTitle>
                      <CardDescription className="text-green-700">
                        Se abrió el {formatDateTimeLocal(currentSession.opened_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} por {currentSession.opened_by_name}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-600">Activa</Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Session Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 mb-1">Efectivo en apertura</p>
                  <p className="text-xl font-bold">{formatPrice(currentSession.opening_cash_amount || 0, currentBusiness)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 mb-1">Ventas en efectivo</p>
                  <p className="text-xl font-bold text-green-600">{formatPrice(cashSalesTotal, currentBusiness)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 mb-1">Efectivo esperado</p>
                  <p className="text-xl font-bold text-blue-600">{formatPrice(expectedCash, currentBusiness)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 mb-1">Total de ventas</p>
                  <p className="text-xl font-bold">{formatPrice(sessionTotals.total, currentBusiness)}</p>
                  <p className="text-xs text-slate-400">{sessionTotals.count} transacciones</p>
                </CardContent>
              </Card>
            </div>

            {/* Sales by Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ventas por método de pago</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMovements.length > 0 ? (
                  <div className="space-y-3">
                    {paymentMovements.map((method) => (
                      <div key={method.id} className="flex items-center justify-between py-2 border-b">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: method.color }}
                          />
                          <span className="text-slate-600">{method.name}</span>
                        </div>
                        <span className="font-medium">{formatPrice(method.total, currentBusiness)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-2 font-bold pt-2">
                      <span>Total</span>
                      <span>{formatPrice(sessionTotals.total, currentBusiness)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
                    No se cobró en ningún método de pago desde que la caja está abierta.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Close Button */}
            <Button 
              variant="destructive" 
              size="lg" 
              className="w-full"
              onClick={() => setShowCloseDialog(true)}
            >
              <Lock className="w-5 h-5 mr-2" />
              Cerrar caja registradora
            </Button>

            {/* Recent Sessions (also shown when open) */}
            {recentSessions.length > 0 && (
              <Collapsible open={showRecentSessions} onOpenChange={setShowRecentSessions}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Recent Sessions</CardTitle>
                        <ChevronDown className={`w-5 h-5 transition-transform ${showRecentSessions ? 'rotate-180' : ''}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {recentSessions.map((session) => (
                          <div key={session.id} className="p-4 hover:bg-slate-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  {formatDateTimeLocal(session.opened_at, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {formatDateTimeLocal(session.opened_at, { hour: '2-digit', minute: '2-digit', hour12: false })} - {formatDateTimeLocal(session.closed_at, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{formatPrice(session.real_cash || 0, currentBusiness)}</p>
                                <div className="flex items-center gap-1 text-sm">
                                  {session.cash_difference === 0 ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <AlertCircle className={`w-4 h-4 ${session.cash_difference > 0 ? 'text-green-500' : 'text-red-500'}`} />
                                  )}
                                  <span className={session.cash_difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {session.cash_difference >= 0 ? '+' : ''}{formatPrice(session.cash_difference || 0, currentBusiness)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </div>
        ) : (
          /* Closed Register View */
          <div className="space-y-6">
            <Card className="border-slate-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Lock className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-900">Caja cerrada</CardTitle>
                    <CardDescription>
                      Abrí la caja para empezar a registrar ventas en el día de hoy
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={() => setShowOpenDialog(true)}
                >
                  <Unlock className="w-5 h-5 mr-2" />
                  Abrir Caja Registradora
                </Button>
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
              <Collapsible open={showRecentSessions} onOpenChange={setShowRecentSessions}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Sesiones recientes</CardTitle>
                        <ChevronDown className={`w-5 h-5 transition-transform ${showRecentSessions ? 'rotate-180' : ''}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {recentSessions.map((session) => (
                          <div key={session.id} className="p-4 hover:bg-slate-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  {formatDateTimeLocal(session.opened_at, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {formatDateTimeLocal(session.opened_at, { hour: '2-digit', minute: '2-digit', hour12: false })} - {formatDateTimeLocal(session.closed_at, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{formatPrice(session.real_cash || 0, currentBusiness)}</p>
                                <div className="flex items-center gap-1 text-sm">
                                  {session.cash_difference === 0 ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <AlertCircle className={`w-4 h-4 ${session.cash_difference > 0 ? 'text-green-500' : 'text-red-500'}`} />
                                  )}
                                  <span className={session.cash_difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {session.cash_difference >= 0 ? '+' : ''}{formatPrice(session.cash_difference || 0, currentBusiness)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </div>
          )}
        </div>
        )}
      </div>

      {/* Open Dialog */}
      <CashRegisterOpenModal
        open={showOpenDialog}
        onClose={() => setShowOpenDialog(false)}
        onConfirm={(amount) => {
          handleOpenRegister(amount);
        }}
        loading={loading}
      />

      {/* Close Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cierre de Caja</DialogTitle>
            <DialogDescription>
              Contá el efectivo actual e ingresá el monto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-100 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Efectivo en apertura</span>
                <span>{formatPrice(currentSession?.opening_cash_amount || 0, currentBusiness)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Ventas en efectivo</span>
                <span className="text-green-600">+{formatPrice(cashSalesTotal, currentBusiness)}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Efectivo esperado</span>
                <span>{formatPrice(expectedCash, currentBusiness)}</span>
              </div>
            </div>
            
            <div>
              <Label>Monto actual en caja</Label>
              <Input
                type="number"
                step="0.01"
                value={realCash}
                onChange={(e) => setRealCash(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
              {realCash && (
                <p className={`text-sm mt-1 ${
                  parseFloat(realCash) >= expectedCash ? 'text-green-600' : 'text-red-600'
                }`}>
                  Diferencia: {parseFloat(realCash) >= expectedCash ? '+' : ''}{formatPrice((parseFloat(realCash) || 0) - expectedCash, currentBusiness)}
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCloseDialog(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleCloseRegister} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cerrar caja
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
