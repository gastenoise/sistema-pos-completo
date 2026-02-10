import React, { useState } from 'react';
import { apiClient } from '@/api/client';
import { getToken } from '@/api/auth';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import {
  DollarSign,
  Calendar, Loader2, FileText, Ban, Eye, Trash2
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { normalizeListResponse } from '@/lib/normalizeResponse';
import { formatPrice } from '@/lib/formatPrice';
import { getPaymentMethodIcon } from '@/utils/paymentMethodIcons';

import { useBusiness } from '../components/pos/BusinessContext';
import { useAuth } from '../lib/AuthContext';
import TopNav from '../components/pos/TopNav';
import CsvExportButton from '../components/pos/CsvExportButton';

export default function Reports() {
  const { businessId, currentBusiness } = useBusiness();
  const { user, logout } = useAuth();

  const today = format(new Date(), 'yyyy-MM-dd');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [dateMode, setDateMode] = useState('today'); // 'today', 'week', 'month', 'custom'
  const [tempDateFrom, setTempDateFrom] = useState(today);
  const [tempDateTo, setTempDateTo] = useState(today);
  const [selectedSale, setSelectedSale] = useState(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [statusTab, setStatusTab] = useState('closed');
  const selectedPaymentMethod = paymentMethodFilter !== 'all' ? paymentMethodFilter : null;

  // Fetch sales
  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['sales', businessId, dateFrom, dateTo, statusTab, selectedPaymentMethod],
    queryFn: async () => {
      if (!businessId) return [];
      try {
        const params = new URLSearchParams({
          start_date: dateFrom,
          end_date: dateTo
        });
        params.set('statuses', statusTab);
        if (selectedPaymentMethod) {
          params.set('payment_method', selectedPaymentMethod);
        }
        const response = await apiClient.get(`/protected/reports/sales?${params.toString()}`);
        return normalizeListResponse(response, 'sales');
      } catch (error) {
        if (error?.status === 404) {
          const params = new URLSearchParams({
            start_date: dateFrom,
            end_date: dateTo,
            type: 'sales',
            format_json: '1'
          });
          const fallback = await apiClient.get(`/protected/reports/export?${params.toString()}`);
          return normalizeListResponse(fallback, 'sales');
        }
        throw error;
      }
    },
    enabled: !!businessId
  });

  const { data: salesSummary = {} } = useQuery({
    queryKey: ['sales-summary', businessId, dateFrom, dateTo, selectedPaymentMethod],
    queryFn: async () => {
      if (!businessId) return {};
      const params = new URLSearchParams({
        start_date: dateFrom,
        end_date: dateTo
      });
      if (selectedPaymentMethod) {
        params.set('payment_method', selectedPaymentMethod);
      }
      const response = await apiClient.get(`/protected/reports/summary?${params.toString()}`);
      return response?.data ?? response;
    },
    enabled: !!businessId
  });

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['paymentMethods', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/payment-methods');
      return normalizeListResponse(response, 'payment_methods').map((method) => ({
        ...method,
        type: method.type || method.code
      }));
    },
    enabled: !!businessId
  });

  const summary = salesSummary?.summary || {};
  const totalsByPaymentMethod = salesSummary?.totals_by_payment_method || [];
  const paymentTotals = totalsByPaymentMethod.reduce((acc, method) => {
    acc[method.code] = parseFloat(method.total_amount) || 0;
    return acc;
  }, {});

  const paymentMethodColorLookup = paymentMethods.reduce((acc, method) => {
    acc[method.type] = method.color;
    return acc;
  }, {});

  const statusOptions = [
    { value: 'closed', label: 'Closed' },
    { value: 'open', label: 'Open' },
    { value: 'voided', label: 'Voided' }
  ];

  const clearFilters = () => {
    setQuickDate('today');
    setPaymentMethodFilter('all');
  };

  const handleExportCsv = async () => {
    try {
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
      const token = getToken();
      const response = await fetch(`${baseUrl}/protected/reports/export?start_date=${dateFrom}&end_date=${dateTo}&type=sales&statuses=${encodeURIComponent(statusTab)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(businessId ? { 'X-Business-Id': businessId } : {})
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${dateFrom}-to-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handleLogout = () => {
    logout();
  };

  const setQuickDate = (preset) => {
    const now = new Date();
    setDateMode(preset);
    switch (preset) {
      case 'today': {
        const todayStr = format(now, 'yyyy-MM-dd');
        setDateFrom(todayStr);
        setDateTo(todayStr);
        setTempDateFrom(todayStr);
        setTempDateTo(todayStr);
        break;
      }
      case 'week': {
        const weekStart = format(subDays(now, 7), 'yyyy-MM-dd');
        const weekEnd = format(now, 'yyyy-MM-dd');
        setDateFrom(weekStart);
        setDateTo(weekEnd);
        setTempDateFrom(weekStart);
        setTempDateTo(weekEnd);
        break;
      }
      case 'month': {
        const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
        setDateFrom(monthStart);
        setDateTo(monthEnd);
        setTempDateFrom(monthStart);
        setTempDateTo(monthEnd);
        break;
      }
      case 'custom': {
        setTempDateFrom(dateFrom);
        setTempDateTo(dateTo);
        break;
      }
    }
  };

  const handleApplyCustomDates = () => {
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav user={user} onLogout={handleLogout} currentPage="Reports" />

      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sales Reports</h1>
            <p className="text-slate-500">View and export your sales data</p>
          </div>
          <CsvExportButton onExport={handleExportCsv} />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={dateMode === 'today' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickDate('today')}
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Today
                </Button>
                <Button
                  variant={dateMode === 'week' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickDate('week')}
                >
                  Last 7 days
                </Button>
                <Button
                  variant={dateMode === 'month' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickDate('month')}
                >
                  This month
                </Button>
                <Button
                  variant={dateMode === 'custom' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickDate('custom')}
                >
                  Custom
                </Button>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={dateMode === 'custom' ? tempDateFrom : dateFrom}
                    onChange={(e) => setTempDateFrom(e.target.value)}
                    className="w-full sm:w-40"
                    disabled={dateMode !== 'custom'}
                  />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={dateMode === 'custom' ? tempDateTo : dateTo}
                    onChange={(e) => setTempDateTo(e.target.value)}
                    className="w-full sm:w-40"
                    disabled={dateMode !== 'custom'}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleApplyCustomDates}
                  disabled={dateMode !== 'custom'}
                >
                  Apply
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMoreFiltersOpen(true)}
                >
                  More Filter
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isMoreFiltersOpen} onOpenChange={setIsMoreFiltersOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>More Filters</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Payment method</Label>
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {paymentMethods.filter(m => m.is_active).map(m => (
                      <SelectItem key={m.id} value={m.type}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Summary Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Top Row: Transactions and Total Sales */}
              <div className="grid grid-cols-2 gap-4">
                {/* Transactions */}
                <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-lg">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <FileText className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-600 font-medium">Closed Transactions</p>
                    <p className="text-2xl font-bold text-amber-900">{summary.sales_count ?? 0}</p>
                    <p className="text-xs text-amber-600">Closed sales only</p>
                  </div>
                </div>

                {/* Total Sales */}
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Closed Sales Total</p>
                    <p className="text-2xl font-bold text-blue-900">{formatPrice(summary.total_sales ?? 0, currentBusiness)}</p>
                    <p className="text-xs text-blue-600">Closed sales only</p>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Payment Methods */}
              <div className="grid grid-cols-4 gap-4">
                {paymentMethods.filter(m => (m.is_active ?? m.active)).slice(0, 4).map((method) => {
                  const MethodIcon = getPaymentMethodIcon(method.icon);
                  return (
                    <div key={method.id} className="flex flex-col gap-2 p-4 rounded-lg border-2" style={{
                      borderColor: (method.color || '#6B7280') + '40',
                      backgroundColor: (method.color || '#6B7280') + '10'
                    }}>
                      <div className="flex items-center gap-2">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: (method.color || '#6B7280') + '30' }}
                        >
                          <MethodIcon
                            className="w-4 h-4"
                            style={{ color: method.color || '#6B7280' }}
                          />
                        </div>
                        <p className="text-xs font-medium" style={{ color: method.color || '#6B7280' }}>
                          {method.name}
                        </p>
                      </div>
                      <p className="text-xl font-bold text-slate-900">
                        {formatPrice(paymentTotals[method.type] || 0, currentBusiness)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Sales</CardTitle>
              <Tabs value={statusTab} onValueChange={setStatusTab}>
                <TabsList>
                  {statusOptions.map((status) => (
                    <TabsTrigger key={status.value} value={status.value}>
                      {status.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSales ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <FileText className="w-12 h-12 mb-3" />
                <p className="text-lg font-medium">No sales found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {format(new Date(sale.closed_at || sale.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={sale.status === 'closed' ? 'default' : 'secondary'}
                            className={
                              sale.status === 'closed' ? 'bg-green-100 text-green-800' :
                              sale.status === 'voided' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }
                          >
                            {sale.status === 'voided' && <Ban className="w-3 h-3 mr-1" />}
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sale.items?.length || 0} items
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: paymentMethodColorLookup[sale.payment_method_type] || '#6B7280' }}
                            />
                            <span className="capitalize">{sale.payment_method_type || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(sale.total_amount ?? sale.total ?? 0, currentBusiness)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedSale(sale)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sale Detail Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6">
              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium">{format(new Date(selectedSale.closed_at || selectedSale.created_at), 'PPpp')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge
                    variant={selectedSale.status === 'closed' ? 'default' : 'secondary'}
                    className={
                      selectedSale.status === 'closed' ? 'bg-green-100 text-green-800' :
                      selectedSale.status === 'voided' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }
                  >
                    {selectedSale.status}
                  </Badge>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-medium mb-3">Items</h3>
                <div className="space-y-2">
                  {selectedSale.items?.map((item, idx) => {
                    const quantity = item.quantity ?? 0;
                    const unitPrice = item.unit_price ?? item.unit_price_snapshot ?? item.price ?? 0;
                    const subtotal = item.subtotal ?? item.total ?? (quantity * unitPrice);
                    const name = item.name ?? item.item_name_snapshot ?? item.item?.name ?? 'Item';
                    return (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-sm text-slate-500">Qty: {quantity} × {formatPrice(unitPrice, currentBusiness)}</p>
                        </div>
                        <p className="font-medium">{formatPrice(subtotal, currentBusiness)}</p>
                      </div>
                    );
                  }) || <p className="text-slate-400 text-sm">No items</p>}
                </div>
              </div>

              {/* Payment Info */}
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-3">Payment Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">{formatPrice(selectedSale.subtotal ?? selectedSale.total_amount ?? 0, currentBusiness)}</span>
                  </div>
                  {selectedSale.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tax</span>
                      <span className="font-medium">{formatPrice(selectedSale.tax, currentBusiness)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-lg">{formatPrice(selectedSale.total_amount ?? selectedSale.total ?? 0, currentBusiness)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-600">Payment Method</span>
                    <Badge variant="outline" className="capitalize">
                      {selectedSale.payment_method_type || 'N/A'}
                    </Badge>
                  </div>
                  {selectedSale.payment_reference && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Reference</span>
                      <span className="font-mono text-sm">{selectedSale.payment_reference}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedSale.customer_name && (
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Customer</h3>
                  <p>{selectedSale.customer_name}</p>
                  {selectedSale.customer_email && (
                    <p className="text-sm text-slate-500">{selectedSale.customer_email}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
