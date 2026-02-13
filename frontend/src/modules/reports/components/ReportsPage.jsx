import React, { useState } from 'react';
import { apiClient } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  Calendar, Loader2, FileText, Ban, Eye, Trash2
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
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
import {
  formatDateTimeLocal,
  getCurrentMonthRangeLocal,
  getLastNDaysRangeLocal,
  getTodayISODateLocal,
} from '@/lib/dateTime';
import { getPaymentMethodIcon } from '@/utils/paymentMethodIcons';
import { getSaleStatusLabel } from '@/lib/saleStatus';

import { useBusiness } from '@/components/pos/BusinessContext';
import { useAuth } from '@/lib/AuthContext';
import TopNav from '@/components/pos/TopNav';
import CsvExportButton from '@/components/pos/CsvExportButton';
import SaleDetailsDialog from '@/components/sales/SaleDetailsDialog';

export default function Reports() {
  const { businessId, currentBusiness, businesses } = useBusiness();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  // Keep yyyy-MM-dd for API compatibility; dates are computed from the browser local day.
  const today = getTodayISODateLocal();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [dateMode, setDateMode] = useState('today'); // 'today', 'week', 'month', 'custom'
  const [tempDateFrom, setTempDateFrom] = useState(today);
  const [tempDateTo, setTempDateTo] = useState(today);
  const [selectedSale, setSelectedSale] = useState(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [statusTab, setStatusTab] = useState('closed');
  const selectedPaymentMethod = paymentMethodFilter !== 'all' ? paymentMethodFilter : null;
  const selectedCategory = categoryFilter !== 'all' ? categoryFilter : null;


  const selectedBusiness = businesses.find((business) => {
    const id = business?.business_id ?? business?.id;
    return String(id) === String(businessId);
  });

  const currentBusinessRole = currentBusiness?.pivot?.role
    || currentBusiness?.role
    || selectedBusiness?.pivot?.role
    || selectedBusiness?.role
    || null;

  const canVoidSales = currentBusinessRole === 'admin';
  // Fetch sales
  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['sales', businessId, dateFrom, dateTo, statusTab, selectedPaymentMethod, selectedCategory],
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
        if (selectedCategory) {
          params.set('category_id', selectedCategory);
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
    queryKey: ['sales-summary', businessId, dateFrom, dateTo, selectedPaymentMethod, selectedCategory],
    queryFn: async () => {
      if (!businessId) return {};
      const params = new URLSearchParams({
        start_date: dateFrom,
        end_date: dateTo
      });
      if (selectedPaymentMethod) {
        params.set('payment_method', selectedPaymentMethod);
      }
      if (selectedCategory) {
        params.set('category_id', selectedCategory);
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

  const { data: categories = [] } = useQuery({
    queryKey: ['report-categories', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const response = await apiClient.get('/protected/categories');
      return normalizeListResponse(response, 'categories');
    },
    enabled: !!businessId
  });

  const summary = salesSummary?.summary || {};
  const totalsByPaymentMethod = salesSummary?.totals_by_payment_method || [];
  const totalsByCategory = (salesSummary?.totals_by_category || []).filter(
    (category) => (parseFloat(category.total_amount) || 0) > 0
  );
  const resolveCategoryColor = (category) => {
    const colorHex = typeof category?.color_hex === 'string' ? category.color_hex.trim() : '';
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorHex)) {
      return colorHex;
    }

    const colorValue = typeof category?.color === 'string' ? category.color.trim() : '';
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorValue)) {
      return colorValue;
    }

    return '#64748B';
  };

  const paymentTotals = totalsByPaymentMethod.reduce((acc, method) => {
    acc[method.code] = parseFloat(method.total_amount) || 0;
    return acc;
  }, {});

  const visiblePaymentMethodTotals = totalsByPaymentMethod.filter(
    (method) => (parseFloat(method.total_amount) || 0) > 0
  );

  const paymentMethodLookup = paymentMethods.reduce((acc, method) => {
    if (method.code) {
      acc[method.code] = method;
    }
    if (method.type) {
      acc[method.type] = method;
    }
    return acc;
  }, {});

  const paymentMethodColorLookup = paymentMethods.reduce((acc, method) => {
    if (method.code) {
      acc[method.code] = method.color;
    }
    if (method.type) {
      acc[method.type] = method.color;
    }
    return acc;
  }, {});

  const getSalePaymentBreakdown = (sale) => {
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
      const code = payment.payment_method_code || payment.code || payment.type || 'unknown';
      const method = paymentMethodLookup[code] || {};
      return {
        code,
        name: method.name || code,
        amount: parseFloat(payment.amount) || 0,
      };
    });
  };

  const getSalePaymentMethodsLabel = (sale) => {
    const breakdown = getSalePaymentBreakdown(sale);
    if (breakdown.length === 0) return '—';

    return [...new Set(breakdown.map((entry) => entry.name))].join(', ');
  };

  const statusOptions = [
    { value: 'closed', label: getSaleStatusLabel('closed') },
    { value: 'open', label: getSaleStatusLabel('open') },
    { value: 'voided', label: getSaleStatusLabel('voided') }
  ];

  const clearFilters = () => {
    setQuickDate('today');
    setPaymentMethodFilter('all');
    setCategoryFilter('all');
  };

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams({
        start_date: dateFrom,
        end_date: dateTo,
        type: 'sales',
        statuses: statusTab
      });
      const response = await apiClient.get(`/protected/reports/export?${params.toString()}`, {
        responseType: 'blob',
        includeMeta: true
      });

      const contentDisposition = response.headers.get('content-disposition') || '';
      const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const serverFileName = decodeURIComponent(fileNameMatch?.[1] || fileNameMatch?.[2] || '').trim();
      const fallbackName = `sales-report-${dateFrom}-to-${dateTo}.csv`;
      const fileName = serverFileName || fallbackName;

      const mimeType = response.data.type || response.headers.get('content-type') || 'text/csv;charset=utf-8';
      const downloadableBlob = response.data.type
        ? response.data
        : new Blob([response.data], { type: mimeType });

      if (!downloadableBlob.size) {
        toast.error('Export completed but the file is empty. Try a different date range.');
        return;
      }

      const url = URL.createObjectURL(downloadableBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch (error) {
      toast.error(error?.message || 'Failed to export report');
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
        const todayStr = getTodayISODateLocal(now);
        setDateFrom(todayStr);
        setDateTo(todayStr);
        setTempDateFrom(todayStr);
        setTempDateTo(todayStr);
        break;
      }
      case 'week': {
        const { startDate, endDate } = getLastNDaysRangeLocal(7, now);
        setDateFrom(startDate);
        setDateTo(endDate);
        setTempDateFrom(startDate);
        setTempDateTo(endDate);
        break;
      }
      case 'month': {
        const { startDate, endDate } = getCurrentMonthRangeLocal(now);
        setDateFrom(startDate);
        setDateTo(endDate);
        setTempDateFrom(startDate);
        setTempDateTo(endDate);
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
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4">
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
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
              </div>

              <div className="flex w-full flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                <Button
                  variant={dateMode === 'custom' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickDate('custom')}
                  className="w-full sm:w-auto"
                >
                  Custom
                </Button>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Label className="text-xs text-slate-600">From</Label>
                  <Input
                    type="date"
                    value={dateMode === 'custom' ? tempDateFrom : dateFrom}
                    onChange={(e) => setTempDateFrom(e.target.value)}
                    className="w-full sm:w-36"
                    disabled={dateMode !== 'custom'}
                  />
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Label className="text-xs text-slate-600">To</Label>
                  <Input
                    type="date"
                    value={dateMode === 'custom' ? tempDateTo : dateTo}
                    onChange={(e) => setTempDateTo(e.target.value)}
                    className="w-full sm:w-36"
                    disabled={dateMode !== 'custom'}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleApplyCustomDates}
                  disabled={dateMode !== 'custom'}
                  className="w-full sm:w-auto"
                >
                  Apply
                </Button>
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end lg:ml-auto">
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

              <div>
                <Label className="text-sm">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="uncategorized">Sin categoría</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
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
                {visiblePaymentMethodTotals.slice(0, 4).map((methodTotal) => {
                  const methodCode = methodTotal.code || methodTotal.type;
                  const method = paymentMethodLookup[methodCode] || {};
                  const methodColor = method.color || '#6B7280';
                  const methodName = method.name || methodTotal.code || 'Unknown';
                  const MethodIcon = getPaymentMethodIcon(method.icon || methodCode);
                  return (
                    <div key={methodCode} className="flex flex-col gap-2 p-4 rounded-lg border-2" style={{
                      borderColor: methodColor + '40',
                      backgroundColor: methodColor + '10'
                    }}>
                      <div className="flex items-center gap-2">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: methodColor + '30' }}
                        >
                          <MethodIcon
                            className="w-4 h-4"
                            style={{ color: methodColor }}
                          />
                        </div>
                        <p className="text-xs font-medium" style={{ color: methodColor }}>
                          {methodName}
                        </p>
                      </div>
                      <p className="text-xl font-bold text-slate-900">
                        {formatPrice(paymentTotals[methodTotal.code] || 0, currentBusiness)}
                      </p>
                    </div>
                  );
                })}
              </div>


              {totalsByCategory.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Sales by category</p>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {totalsByCategory.map((category) => {
                      const categoryColor = resolveCategoryColor(category);
                      return (
                        <div
                          key={category.id ?? `uncategorized-${category.name}`}
                          className="flex flex-col gap-1.5 rounded-lg border p-3"
                          style={{
                            borderColor: `${categoryColor}40`,
                            backgroundColor: `${categoryColor}10`
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                              style={{ backgroundColor: `${categoryColor}30` }}
                            >
                              {(() => {
                                const IconComponent = LucideIcons[category.icon] || LucideIcons.Package;
                                return <IconComponent className="h-3.5 w-3.5" style={{ color: categoryColor }} aria-hidden="true" />;
                              })()}
                            </div>
                            <p className="truncate text-[11px] font-medium" style={{ color: categoryColor }}>
                              {category.name}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-slate-900">
                            {formatPrice(category.total_amount || 0, currentBusiness)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                          {formatDateTimeLocal(sale.closed_at || sale.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
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
                            {getSaleStatusLabel(sale.status)}
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
                            <span className="text-sm">{getSalePaymentMethodsLabel(sale)}</span>
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
      <SaleDetailsDialog
        open={!!selectedSale}
        onOpenChange={(open) => !open && setSelectedSale(null)}
        sale={selectedSale}
        currentBusiness={currentBusiness}
        paymentMethodLookup={paymentMethodLookup}
        canVoid={canVoidSales}
        onVoided={() => {
          setSelectedSale((prev) => (prev ? { ...prev, status: 'voided' } : prev));
          queryClient.invalidateQueries({ queryKey: ['sales', businessId] });
          queryClient.invalidateQueries({ queryKey: ['sales-summary', businessId] });
        }}
      />
    </div>
  );
}
