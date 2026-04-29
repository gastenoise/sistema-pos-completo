import React, { useState, useEffect } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

export default function ItemEditorModal({ 
  open, 
  onClose, 
  item, 
  initialBarcode = '',
  categories = [],
  onSave,
  onDelete,
  loading = false
}: any) {
  const NO_CATEGORY_VALUE = 'none';
  const isSepaItem = item?.source === 'sepa';
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category_id: '',
    price: '',
    presentation_quantity: '',
    presentation_unit: '',
    brand: '',
    list_price: ''
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (item) {
      setFormData({
        name: item.name || '',
        sku: item.sku || '',
        barcode: item.barcode || '',
        category_id: item.category_id ? String(item.category_id) : NO_CATEGORY_VALUE,
        price: item.price?.toString() || '',
        presentation_quantity: item.presentation_quantity?.toString() || '',
        presentation_unit: item.presentation_unit || '',
        brand: item.brand || '',
        list_price: item.list_price?.toString() || ''
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        barcode: initialBarcode || '',
        category_id: NO_CATEGORY_VALUE,
        price: '',
        presentation_quantity: '',
        presentation_unit: '',
        brand: '',
        list_price: ''
      });
    }
  }, [item, open]);

  useEffect(() => {
    if (!open || item) {
      return;
    }

    // Prefill only when opening the creation flow and only if user didn't type a barcode yet.
    setFormData((prev) => {
      if (prev.barcode) {
        return prev;
      }

      const nextBarcode = initialBarcode || '';
      if (prev.barcode === nextBarcode) {
        return prev;
      }

      return {
        ...prev,
        barcode: nextBarcode,
      };
    });
  }, [open, item, initialBarcode]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isSepaItem) {
      // For SEPA items, price is required when there's no business price set
      const nextPrice = formData.price === '' ? null : parseFloat(formData.price);
      
      // Validate that price is provided for SEPA items without existing business price
      if (!item?.has_business_price && (nextPrice === null || !Number.isFinite(nextPrice))) {
        toast.error('El precio final es obligatorio para ítems SEPA sin precio configurado');
        return;
      }
      
      onSave({
        price: Number.isFinite(nextPrice) ? nextPrice : null,
        category_id: formData.category_id !== NO_CATEGORY_VALUE
          ? parseInt(formData.category_id, 10)
          : null,
      });
      return;
    }

    onSave({
      ...formData,
      category_id: formData.category_id !== NO_CATEGORY_VALUE
        ? parseInt(formData.category_id, 10)
        : null,
      price: parseFloat(formData.price) || 0,
      presentation_quantity: formData.presentation_quantity ? parseFloat(formData.presentation_quantity) : null,
      presentation_unit: formData.presentation_unit?.trim() || null,
      brand: formData.brand?.trim() || null,
      list_price: formData.list_price ? parseFloat(formData.list_price) : null
    } as any);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {item ? (isSepaItem ? 'Editar Item SEPA' : 'Editar Item') : 'Agregar Nuevo Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {isSepaItem ? (
              <>
                <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Los ítems SEPA sincronizan su precio de lista automáticamente. 
                  Aquí podés definir el precio final para tu negocio.
                </div>
                <div className="col-span-2">
                  <Label htmlFor="list_price">Precio de lista SEPA (solo lectura)</Label>
                  <Input
                    id="list_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.list_price}
                    disabled
                    className="bg-slate-100 cursor-not-allowed"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="price">Precio final {!item?.has_business_price && '(obligatorio)'}</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    autoFocus
                    required={!item?.has_business_price}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="sepa-category">Categoría</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger id="sepa-category">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY_VALUE}>Sin categoría</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
            <div className="col-span-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Item name"
                required
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="barcode">Barcode (CB)</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Principal para escaneo/sincronización"
              />
            </div>

            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Opcional, para referencia interna"
              />
            </div>


            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY_VALUE}>Sin categoría</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="price">Precio *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="presentation_quantity">Cantidad presentación</Label>
              <Input
                id="presentation_quantity"
                type="number"
                step="0.01"
                min="0"
                value={formData.presentation_quantity}
                onChange={(e) => setFormData({ ...formData, presentation_quantity: e.target.value })}
                placeholder="400.00"
              />
            </div>

            <div>
              <Label htmlFor="presentation_unit">Unidad presentación</Label>
              <Input
                id="presentation_unit"
                value={formData.presentation_unit}
                onChange={(e) => setFormData({ ...formData, presentation_unit: e.target.value })}
                placeholder="gr, kg, cm3"
              />
            </div>

            <div>
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="LA EGIPCIANA"
              />
            </div>

            <div>
              <Label htmlFor="list_price">Precio de lista</Label>
              <Input
                id="list_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.list_price}
                onChange={(e) => setFormData({ ...formData, list_price: e.target.value })}
                placeholder="3490.00"
              />
            </div>
            </>
            )}
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t">
            {item && !isSepaItem && (
              <Button type="button" variant="destructive" onClick={() => onDelete?.(item)} disabled={loading}>
                Eliminar item
              </Button>
            )}
            <div className="flex gap-3 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {item ? (isSepaItem ? 'Guardar' : 'Actualizar') : 'Crear'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
