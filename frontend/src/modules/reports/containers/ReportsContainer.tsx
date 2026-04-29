import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  DialogFooter,
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
import { formatPrice } from '@/lib/formatPrice';
import {
  formatDateTimeLocal,
  getCurrentMonthRangeLocal,
  getLastNDaysRangeLocal,
  getTodayISODateLocal,
} from '@/lib/dateTime';
import { getPaymentMethodIcon } from '@/utils/paymentMethodIcons';
import { getIconComponent } from '@/lib/iconCatalog';
import { getSaleStatusLabel } from '@/lib/saleStatus';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import PageSection from '@/components/layout/PageSection';

import { useBusiness } from '@/components/pos/BusinessContext';
import CsvExportButton from '@/components/pos/CsvExportButton';
import SaleDetailsDialog from '@/components/sales/SaleDetailsDialog';
import {
  useReportCategoriesQuery,
  useReportPaymentMethodsQuery,
  useSalesQuery,
  useSalesSummaryQuery,
} from '@/modules/reports/hooks/useSalesReports';
import { exportSalesReport } from '@/api/reports';
import { TOAST_MESSAGES } from '@/lib/toastMessages';
import { useAuthorization } from '@/components/auth/AuthorizationContext';

// Utilidad reutilizable para la fecha de mañana en formato yyyy-MM-dd
function getTomorrowISODateLocal(referenceDate = new Date()) {
  const date = new Date(referenceDate);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default function Reports() {
  const { businessId, currentBusiness } = useBusiness() as any;
  const queryClient = useQueryClient();

  // Keep yyyy-MM-dd for API compatibility; dates are computed from the browser local day.
  const today = getTodayISODateLocal();
  const tomorrow = getTomorrowISODateLocal();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(tomorrow);
  const [dateMode, setDateMode] = useState('today'); // 'today', 'week', 'month', 'custom'
  const [tempDateFrom, setTempDateFrom] = useState(today);
  const [tempDateTo, setTempDateTo] = useState(tomorrow);
  const [selectedSale, setSelectedSale] = useState(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [draftPaymentMethodFilter, setDraftPaymentMethodFilter] = useState('all');
  const [draftCategoryFilter, setDraftCategoryFilter] = useState('all');
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [statusTab, setStatusTab] = useState('closed');
  const selectedPaymentMethod = paymentMethodFilter !== 'all' ? paymentMethodFilter : null;
  const selectedCategory = categoryFilter !== 'all' ? categoryFilter : null;

  const { role } = useAuthorization();
  const canVoidSales = role === 'owner' || role === 'admin';
  // Fetch sales
  const { data: sales = [], isLoading: loadingSales, isFetching: fetchingSales } = useSalesQuery({
    businessId,
    dateFrom,
    dateTo,
    status: statusTab,
    paymentMethod: selectedPaymentMethod,
    categoryId: selectedCategory
  });

  const { data: salesSummaryData = {}, isFetching: fetchingSummary } = useSalesSummaryQuery({
    businessId,
    dateFrom,
    dateTo,
    paymentMethod: selectedPaymentMethod,
    categoryId: selectedCategory
  });

  const salesSummary = salesSummaryData as any;
  const { data: paymentMethods = [] } = useReportPaymentMethodsQuery(businessId);

  const { data: categories = [] } = useReportCategoriesQuery(businessId);

  const summary = salesSummary?.summary || {};
  const totalsByPaymentMethod = (salesSummary?.totals_by_payment_method || []).slice().sort(
    (a, b) => (parseFloat(b.total_amount) || 0) - (parseFloat(a.total_amount) || 0)
  );
  const totalsByCategory = (salesSummary?.totals_by_category || []).filter(
    (category) => (parseFloat(category.total_amount) || 0) > 0
  );
  const resolveCategoryColor = (category) => {
    const colorValue = typeof category?.color === 'string' ? category.color.trim() : '';
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorValue)) {
      return colorValue;
    }

    return '#64748B';
  };
  const visiblePaymentMethodTotals = totalsByPaymentMethod.filter(
    (method) => (parseFloat(method.total_amount) || 0) > 0
  );
  const topPaymentMethods = visiblePaymentMethodTotals.slice(0, 4);
  const topCategories = totalsByCategory.slice(0, 6);

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

  const showSalesOverlay = !loadingSales && (fetchingSales || fetchingSummary);

  const statusOptions = [
    { value: 'closed', label: 'Cerradas' },
    { value: 'open', label: 'Abiertas' },
    { value: 'voided', label: 'Eliminadas' }
  ];

  const clearFilters = () => {
    setQuickDate('today');
    setPaymentMethodFilter('all');
    setCategoryFilter('all');
    setDraftPaymentMethodFilter('all');
    setDraftCategoryFilter('all');
  };

  const handleOpenMoreFilters = (open) => {
    if (open) {
      setDraftPaymentMethodFilter(paymentMethodFilter);
      setDraftCategoryFilter(categoryFilter);
    }

    setIsMoreFiltersOpen(open);
  };

  const handleApplyMoreFilters = () => {
    setPaymentMethodFilter(draftPaymentMethodFilter);
    setCategoryFilter(draftCategoryFilter);
    setIsMoreFiltersOpen(false);
  };

  const handleClearMoreFilters = () => {
    // Reportes: limpiamos método/categoría y mantenemos el rango de fechas vigente.
    setDraftPaymentMethodFilter('all');
    setDraftCategoryFilter('all');
    setPaymentMethodFilter('all');
    setCategoryFilter('all');
    setIsMoreFiltersOpen(false);
  };

  const handleExportCsv = async () => {
    try {
      const response: any = await exportSalesReport({ dateFrom, dateTo, status: statusTab });

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
        toast.error(TOAST_MESSAGES.reports.exportEmptyFile);
        return;
      }

      const url = URL.createObjectURL(downloadableBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(TOAST_MESSAGES.reports.exportSuccess);
    } catch (error) {
      toast.error(error?.message || TOAST_MESSAGES.reports.exportError);
    }
  };


  const setQuickDate = (preset) => {
    const now = new Date();
    setDateMode(preset);

    switch (preset) {
      case 'today': {
        const todayStr = getTodayISODateLocal(now);
        const tomorrowStr = getTomorrowISODateLocal(now);

        setDateFrom(todayStr);
        setDateTo(tomorrowStr);
        setTempDateFrom(todayStr);
        setTempDateTo(tomorrowStr);
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
    <>
      <PageContainer>
        <PageHeader
          title="Reportes de Ventas"
          description="Visualiza y exporta la información de tus ventas"
          actions={<CsvExportButton onExport={handleExportCsv} />}
        />

        {/* Filters */}
        <PageSection>
          <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4">
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <Button
                  variant={dateMode === 'today' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickDate('today')}
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Hoy
                </Button>
                <Button
                  variant={dateMode === 'week' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickDate('week')}
                >
                  Últimos 7 días
                </Button>
                <Button
                  variant={dateMode === 'month' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickDate('month')}
                >
                  Este mes
                </Button>
              </div>

              <div className="flex w-full flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                <Button
                  variant={dateMode === 'custom' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickDate('custom')}
                  className="w-full sm:w-auto"
                >
                  Otro
                </Button>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Label className="text-xs text-slate-600">Desde</Label>
                  <Input
                    type="date"
                    value={dateMode === 'custom' ? tempDateFrom : dateFrom}
                    onChange={(e) => setTempDateFrom(e.target.value)}
                    className="w-full sm:w-36"
                    disabled={dateMode !== 'custom'}
                  />
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Label className="text-xs text-slate-600">Hasta</Label>
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
                  Aplicar
                </Button>
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end lg:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenMoreFilters(true)}
                >
                  Más Filtros
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </CardContent>
          </Card>
        </PageSection>

        <Dialog open={isMoreFiltersOpen} onOpenChange={handleOpenMoreFilters}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Más Filtros</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Método de pago</Label>
                <Select value={draftPaymentMethodFilter} onValueChange={setDraftPaymentMethodFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Métodos</SelectItem>
                    {paymentMethods.filter(m => m.is_active).map(m => (
                      <SelectItem key={m.id} value={m.type}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Categoría</Label>
                <Select value={draftCategoryFilter} onValueChange={setDraftCategoryFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las Categorías</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                    ))}
                    <SelectItem value="uncategorized">Sin categoría</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={handleClearMoreFilters} className="w-full sm:w-auto">Eliminar filtros</Button>
              <Button type="button" onClick={handleApplyMoreFilters} className="w-full sm:w-auto">Aplicar filtros</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Summary Card */}
        <PageSection>
          <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Top Row: Transactions and Total Sales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Transactions */}
                <div className="flex items-center gap-4 p-3 sm:p-4 bg-amber-50 rounded-lg">
                  <div className="p-2 sm:p-3 bg-amber-100 rounded-lg">
                    <FileText className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-600 font-medium">Transacciones cerradas</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-900">{summary.sales_count ?? 0}</p>
                  </div>
                </div>

                {/* Total Sales */}
                <div className="flex items-center gap-4 p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total de ventas</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900">{formatPrice(summary.total_sales ?? 0, currentBusiness)}</p>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Payment Methods */}
              {topPaymentMethods.length > 0 && (
                <div className="flex flex-wrap gap-4 sm:flex-nowrap">
                  {topPaymentMethods.map((methodTotal) => {
                    const methodCode = methodTotal.code || methodTotal.type;
                    const method = paymentMethodLookup[methodCode] || {};
                    const methodColor = method.color || '#6B7280';
                    const methodName = method.name || methodTotal.code || 'Unknown';
                    const MethodIcon = getPaymentMethodIcon(method.icon || methodCode);
                    return (
                    <div key={methodCode} className="min-w-0 flex-1 basis-[calc(50%-0.5rem)] sm:basis-0 flex flex-col gap-2 p-4 rounded-lg border-2" style={{
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
                        {formatPrice(parseFloat(methodTotal.total_amount) || 0, currentBusiness)}
                      </p>
                    </div>
                    );
                  })}
                </div>
              )}


              {topCategories.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Ventas por categoría</p>
                  <div className="flex flex-wrap gap-4 lg:flex-nowrap">
                    {topCategories.map((category) => {
                      const categoryColor = resolveCategoryColor(category);
                      return (
                        <div
                          key={category.id ?? `uncategorized-${category.name}`}
                          className="min-w-0 flex-1 basis-[calc(50%-0.5rem)] sm:basis-[calc(33.333%-0.666rem)] lg:basis-0 flex flex-col gap-1.5 rounded-lg border p-3"
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
                                const IconComponent = getIconComponent(category.icon);
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
        </PageSection>

        {/* Sales Table */}
        <PageSection>
          <Card className="relative">
          {showSalesOverlay && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60">
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
              </div>
            </div>
          )}
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Ventas</CardTitle>
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
                <p className="text-lg font-medium">No se encontraron ventas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Forma de pago</TableHead>
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
        </PageSection>
      </PageContainer>

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
    </>
  );
}
