import React, { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TOAST_MESSAGES } from '@/lib/toastMessages';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dialog";

type QuickAddFormProps = {
  onAdd: (itemData: {
    name: string;
    price: number;
    save_to_catalog: boolean;
    category_id: number;
    barcode: string;
  }) => Promise<void> | void;
  categories?: any[];
  loading?: boolean;
  open?: boolean;
  onOpenChange?: (nextOpen: boolean) => void;
  initialBarcode?: string;
};

export default function QuickAddForm({
  onAdd,
  categories = [],
  loading = false,
  open: controlledOpen,
  onOpenChange,
  initialBarcode = '',
}: QuickAddFormProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    price: '',
    category_id: '',
    save_to_catalog: false,
    name: '',
    barcode: '',
  });
  const isOpenControlled = typeof controlledOpen === 'boolean';
  const open = isOpenControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = (nextOpen) => {
    if (!isOpenControlled) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);

    if (nextOpen) {
      setFormData((prev) => ({
        ...prev,
        save_to_catalog: false,
        barcode: initialBarcode || prev.barcode,
      }));
    }
  };

  useEffect(() => {
    if (!open || !initialBarcode) {
      return;
    }

    setFormData((prev) => ({ ...prev, barcode: initialBarcode }));
  }, [initialBarcode, open]);

  const selectedCategory = categories.find((category) => String(category.id) === String(formData.category_id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id || !selectedCategory || !formData.price) return;

    setIsLoading(true);
    try {
      const resolvedName = formData.name.trim() || selectedCategory.name;

      await onAdd({
        name: resolvedName,
        price: parseFloat(formData.price),
        save_to_catalog: formData.save_to_catalog,
        category_id: Number(formData.category_id),
        barcode: formData.barcode.trim(),
      });
      toast.success(TOAST_MESSAGES.items.quickAddSuccess);
      setFormData({ price: '', category_id: '', save_to_catalog: false, name: '', barcode: '' });
      handleOpenChange(false);
    } catch (_error) {
      toast.error(TOAST_MESSAGES.items.quickAddError);
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitting = loading || isLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button">
          <Plus className="w-4 h-4" />
          Item rápido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar Item Rápido</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Categoría</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categories.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Primero crea al menos una categoría para usar Item Rápido.</p>
            )}
          </div>

          <div>
            <Label>Precio</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2">
            <Checkbox
              checked={formData.save_to_catalog}
              onCheckedChange={(checked) => setFormData({ ...formData, save_to_catalog: checked === true })}
            />
            <span className="text-sm text-slate-700">Guardar también en listado de items</span>
          </label>

          <div>
            <Label>Nombre (opcional)</Label>
            <Input
              type="text"
              placeholder="Si lo dejas vacío, se usa el nombre de la categoría"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <Label>Código de barras (opcional)</Label>
            <Input
              type="text"
              placeholder="CB"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || !formData.category_id || !selectedCategory || !formData.price || categories.length === 0}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Agregar a la venta
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
