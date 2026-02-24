import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ItemsFiltersDialog({
  searchValue,
  onSearchChange,
  barcodeOrSkuValue,
  onBarcodeOrSkuChange,
  categoryValue,
  onCategoryChange,
  sourceValue,
  onSourceChange,
  onlyPriceUpdated,
  onOnlyPriceUpdatedChange,
  onApplyFilters,
  onClearFilters,
  categories = [],
  searchInputRef,
  rightContent = null,
  inputClassName = '',
  searchInputClassName = '',
  barcodeInputClassName = '',
}) {
  const [open, setOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState(String(categoryValue));
  const [draftSource, setDraftSource] = useState(sourceValue);
  const [draftOnlyPriceUpdated, setDraftOnlyPriceUpdated] = useState(Boolean(onlyPriceUpdated));

  useEffect(() => {
    if (!open) return;

    setDraftCategory(String(categoryValue));
    setDraftSource(sourceValue);
    setDraftOnlyPriceUpdated(Boolean(onlyPriceUpdated));
  }, [open, categoryValue, sourceValue, onlyPriceUpdated]);

  const handleApplyFilters = () => {
    const payload = {
      category: draftCategory,
      source: draftSource,
      onlyPriceUpdated: draftOnlyPriceUpdated,
    };

    if (onApplyFilters) {
      onApplyFilters(payload);
    } else {
      onCategoryChange(payload.category);
      onSourceChange(payload.source);
      onOnlyPriceUpdatedChange(payload.onlyPriceUpdated);
    }

    setOpen(false);
  };

  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
      setOpen(false);
      return;
    }

    setDraftCategory('all');
    setDraftSource('all');
    setDraftOnlyPriceUpdated(false);
    onCategoryChange('all');
    onSourceChange('all');
    onOnlyPriceUpdatedChange(false);
    setOpen(false);
  };

  const searchSizeClassName = searchInputClassName || 'flex-1 min-w-[220px]';
  const barcodeSizeClassName = barcodeInputClassName || 'sm:w-44 md:w-52';

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className={`relative ${searchSizeClassName}`.trim()}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="por nombre o marca"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`pl-10 ${inputClassName}`.trim()}
          />
        </div>

        <Input
          type="text"
          placeholder="por barcode o sku"
          inputMode="numeric"
          value={barcodeOrSkuValue}
          onChange={(e) => onBarcodeOrSkuChange(e.target.value)}
          className={`${barcodeSizeClassName} ${inputClassName}`.trim()}
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Más filtros
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Filtros</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <Checkbox
                  checked={draftOnlyPriceUpdated}
                  onCheckedChange={(checked) => setDraftOnlyPriceUpdated(Boolean(checked))}
                />
                precio actualizado
              </label>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">categoría</p>
                <Select value={draftCategory} onValueChange={setDraftCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Categorías</SelectItem>
                    <SelectItem value="uncategorized">Sin Categoría</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">fuente</p>
                <Select value={draftSource} onValueChange={setDraftSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Origen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="local">Locales</SelectItem>
                    <SelectItem value="sepa">SEPA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClearFilters}>Eliminar filtros</Button>
              <Button type="button" onClick={handleApplyFilters}>Aplicar filtros</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {rightContent}
      </div>
    </>
  );
}
