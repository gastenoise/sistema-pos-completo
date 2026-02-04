import React, { useState } from 'react';
import { apiClient } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  DollarSign, Lock, Unlock, Clock, TrendingUp, 
  Loader2, AlertCircle, CheckCircle, ChevronDown
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

import { useBusiness } from '../components/pos/BusinessContext';
import { useAuth } from '../lib/AuthContext';
import TopNav from '../components/pos/TopNav';

export default function CashRegister() {
  const { businessId } = useBusiness();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [realCash, setRealCash] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecentSessions, setShowRecentSessions] = useState(false);

  // Fetch current session
  const { data: currentSession, isLoading: loadingSession, refetch: refetchSession } = useQuery({
    queryKey: ['cashSession', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const response = await apiClient.get('/protected/cash-register/status');
      const status = response?.status || response?.data?.status;
      const session = response?.session || response?.data?.session;
      if (status === 'open' && session) {
        return { status, ...session };
      }
      return null;
    },
    enabled: !!businessId
  });

  // Fetch recent sessions
  const { data: recentSessions = [] } = useQuery({
    queryKey: ['recentSessions', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/cash-register/closed-sessions');
      const sessions = Array.isArray(response)
        ? response
        : response?.sessions || response?.data || [];
      return sessions;
    },
    enabled: !!businessId
  });

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['paymentMethods', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/payment-methods');
      const methods = Array.isArray(response)
        ? response
        : response?.payment_methods || response?.data || [];
      return methods.filter((method) => (method.is_active ?? method.active) !== false);
    },
    enabled: !!businessId
  });

  const paymentMethodColors = {
    cash: '#10B981',
    debit: '#3B82F6',
    credit: '#8B5CF6',
    mercado_pago: '#0EA5E9',
    transfer: '#F59E0B',
    other: '#6B7280'
  };

  // Fetch sales for current session
  const { data: expectedTotals } = useQuery({
    queryKey: ['expectedTotals', currentSession?.id],
    queryFn: async () => {
      if (!currentSession?.id) return [];
      const response = await apiClient.get(`/protected/cash-register/${currentSession.id}/expected-totals`);
      return response?.data || response;
    },
    enabled: !!currentSession?.id
  });

  // Calculate session totals by payment method
  const sessionTotals = {
    total: expectedTotals?.total_sales ?? 0,
    count: expectedTotals?.sales_count ?? 0
  };

  const paymentTotals = {};
  paymentMethods.forEach(method => {
    paymentTotals[method.type] = expectedTotals?.payment_totals?.[method.type] ?? 0;
  });

  const expectedCash = (currentSession?.opening_cash_amount || 0) + (paymentTotals.cash || 0);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  };

  const handleOpenRegister = async () => {
    setLoading(true);
    try {
      await apiClient.post('/protected/cash-register/open', {
        amount: parseFloat(openingAmount) || 0
      });
      await refetchSession();
      setShowOpenDialog(false);
      setOpeningAmount('');
      toast.success('Cash register opened');
    } catch (error) {
      toast.error('Failed to open register');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRegister = async () => {
    if (!currentSession) return;
    
    setLoading(true);
    try {
      const realCashAmount = parseFloat(realCash) || 0;
      await apiClient.post('/protected/cash-register/close', {
        real_cash: realCashAmount
      });
      
      await refetchSession();
      queryClient.invalidateQueries(['recentSessions', businessId]);
      setShowCloseDialog(false);
      setRealCash('');
      toast.success('Cash register closed');
    } catch (error) {
      toast.error('Failed to close register');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav user={user} onLogout={handleLogout} currentPage="Cash Register" />
      
      <div className="max-w-4xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Cash Register</h1>
          <p className="text-slate-500">Manage your cash register sessions</p>
        </div>

        {loadingSession ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : currentSession ? (
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
                      <CardTitle className="text-green-900">Register Open</CardTitle>
                      <CardDescription className="text-green-700">
                        Opened {format(new Date(currentSession.opened_at), 'MMM d, HH:mm')} by {currentSession.opened_by}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-600">Active</Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Session Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 mb-1">Opening Cash</p>
                  <p className="text-xl font-bold">{formatPrice(currentSession.opening_cash_amount || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 mb-1">Cash Sales</p>
                  <p className="text-xl font-bold text-green-600">{formatPrice(paymentTotals.cash || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 mb-1">Expected Cash</p>
                  <p className="text-xl font-bold text-blue-600">{formatPrice(expectedCash)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 mb-1">Total Sales</p>
                  <p className="text-xl font-bold">{formatPrice(sessionTotals.total)}</p>
                  <p className="text-xs text-slate-400">{sessionTotals.count} transactions</p>
                </CardContent>
              </Card>
            </div>

            {/* Sales by Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sales by Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: method.color || paymentMethodColors[method.type] }}
                        />
                        <span className="text-slate-600">{method.name}</span>
                      </div>
                      <span className="font-medium">{formatPrice(paymentTotals[method.type] || 0)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2 font-bold pt-2">
                    <span>Total</span>
                    <span>{formatPrice(sessionTotals.total)}</span>
                  </div>
                </div>
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
              Close Cash Register
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
                                  {format(new Date(session.opened_at), 'MMM d, yyyy')}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {format(new Date(session.opened_at), 'HH:mm')} - {format(new Date(session.closed_at), 'HH:mm')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{formatPrice(session.total_sales || 0)}</p>
                                <div className="flex items-center gap-1 text-sm">
                                  {session.cash_difference === 0 ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <AlertCircle className={`w-4 h-4 ${session.cash_difference > 0 ? 'text-green-500' : 'text-red-500'}`} />
                                  )}
                                  <span className={session.cash_difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {session.cash_difference >= 0 ? '+' : ''}{formatPrice(session.cash_difference || 0)}
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
                    <CardTitle className="text-slate-900">Register Closed</CardTitle>
                    <CardDescription>
                      Open the register to start processing sales
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
                  Open Cash Register
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
                                  {format(new Date(session.opened_at), 'MMM d, yyyy')}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {format(new Date(session.opened_at), 'HH:mm')} - {format(new Date(session.closed_at), 'HH:mm')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{formatPrice(session.total_sales || 0)}</p>
                                <div className="flex items-center gap-1 text-sm">
                                  {session.cash_difference === 0 ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <AlertCircle className={`w-4 h-4 ${session.cash_difference > 0 ? 'text-green-500' : 'text-red-500'}`} />
                                  )}
                                  <span className={session.cash_difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {session.cash_difference >= 0 ? '+' : ''}{formatPrice(session.cash_difference || 0)}
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

      {/* Open Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Cash Register</DialogTitle>
            <DialogDescription>
              Enter the starting cash amount in the register
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Opening Cash Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowOpenDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleOpenRegister} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Open Register
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Cash Register</DialogTitle>
            <DialogDescription>
              Count your cash and enter the actual amount
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-100 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Opening Cash</span>
                <span>{formatPrice(currentSession?.opening_cash_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Cash Sales</span>
                <span className="text-green-600">+{formatPrice(paymentTotals.cash || 0)}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Expected Cash</span>
                <span>{formatPrice(expectedCash)}</span>
              </div>
            </div>
            
            <div>
              <Label>Actual Cash Amount</Label>
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
                  Difference: {parseFloat(realCash) >= expectedCash ? '+' : ''}{formatPrice((parseFloat(realCash) || 0) - expectedCash)}
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCloseDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleCloseRegister} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Close Register
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
