import React, { useState } from 'react';
import { X, Tag, TrendingUp, Loader2, BadgeDollarSign, MoreHorizontal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface Category {
  id: number | string;
  name: string;
}

interface BulkActionsDialogProps {
  selectedCount: number;
  onClear: () => void;
  categories: Category[];
  onAssignCategory: (categoryId: string) => Promise<boolean>;
  onApplyPriceIncrease: (percent: number) => Promise<boolean>;
  onSetFixedPrice: (value: number) => Promise<boolean>;
  loading?: boolean;
}

export default function BulkActionsDialog({
  selectedCount,
  onClear,
  categories = [],
  onAssignCategory,
  onApplyPriceIncrease,
  onSetFixedPrice,
  loading = false,
}: BulkActionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [priceIncrease, setPriceIncrease] = useState('');
  const [fixedPrice, setFixedPrice] = useState('');

  const handleSetFixedPrice = async () => {
    const value = parseFloat(fixedPrice);
    if (!Number.isNaN(value) && value >= 0) {
      const success = await onSetFixedPrice(value);
      if (success) {
        setFixedPrice('');
        setOpen(false);
      }
    }
  };

  const handlePriceIncrease = async () => {
    const percent = parseFloat(priceIncrease);
    if (!isNaN(percent) && percent !== 0) {
      const success = await onApplyPriceIncrease(percent);
      if (success) {
        setPriceIncrease('');
        setOpen(false);
      }
    }
  };

  const handleAssignCategory = async (value: string) => {
    const success = await onAssignCategory(value);
    if (success) {
      setOpen(false);
    }
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm">
      <Dialog open={open} onOpenChange={setOpen}>
        <div className="bg-blue-600 text-white rounded-full shadow-lg flex items-center p-1 pl-4">
          <span className="text-sm font-bold flex-1">
            {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
          </span>
          <DialogTrigger asChild>
            <Button variant="ghost" className="text-white hover:bg-blue-500 rounded-full h-12 px-6">
              <MoreHorizontal className="w-5 h-5 mr-2" />
              Acciones
            </Button>
          </DialogTrigger>
        </div>

        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Acciones masivas ({selectedCount})</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Assign Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Asignar categoría
              </label>
              <Select onValueChange={handleAssignCategory} disabled={loading}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Seleccionar categoría..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Set fixed price */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <BadgeDollarSign className="w-4 h-4" />
                Cambiar precio fijo
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej: 1200"
                  value={fixedPrice}
                  onChange={(e) => setFixedPrice(e.target.value)}
                  className="flex-1 h-12"
                  disabled={loading}
                />
                <Button
                  onClick={handleSetFixedPrice}
                  className="h-12 px-6"
                  disabled={fixedPrice === '' || loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                </Button>
              </div>
              <p className="text-xs text-slate-500">SEPA: 0 restaura al precio base.</p>
            </div>

            {/* Price Increase */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Aumentar precio porcentual
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 10"
                    value={priceIncrease}
                    onChange={(e) => setPriceIncrease(e.target.value)}
                    className="h-12 pr-8"
                    disabled={loading}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                </div>
                <Button
                  onClick={handlePriceIncrease}
                  className="h-12 px-6"
                  disabled={!priceIncrease || loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="w-full h-12 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              disabled={loading}
            >
              <X className="w-4 h-4 mr-2" />
              Limpiar selección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
