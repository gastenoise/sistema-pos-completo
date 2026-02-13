import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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

export default function QuickAddForm({ onAdd, categories = [], loading = false }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    type: 'product',
    category_id: 'none',
    save_to_catalog: false,
  });

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);

    if (nextOpen) {
      setFormData((prev) => ({ ...prev, save_to_catalog: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.type) return;

    setIsLoading(true);
    try {
      await onAdd({
        name: formData.name,
        price: parseFloat(formData.price),
        type: formData.type,
        save_to_catalog: formData.save_to_catalog,
        ...(formData.category_id !== 'none' && { category_id: Number(formData.category_id) })
      });
      toast.success('Item agregado');
      setFormData({ name: '', price: '', type: 'product', category_id: 'none', save_to_catalog: false });
      setOpen(false);
    } catch (error) {
      toast.error('No se pudo agregar el item');
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitting = loading || isLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="w-4 h-4" />
          + Item Rápido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar Item Rápido</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nombre</Label>
            <Input
              placeholder="Nombre del item"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
            />
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

          <div>
            <Label>Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="fee">Fee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Categoría (opcional)</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2">
            <Checkbox
              checked={formData.save_to_catalog}
              onCheckedChange={(checked) => setFormData({ ...formData, save_to_catalog: checked === true })}
            />
            <span className="text-sm text-slate-700">Guardar también en listado de items</span>
          </label>

          <Button type="submit" className="w-full" disabled={isSubmitting || !formData.name || !formData.price || !formData.type}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Agregar a la venta
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
