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

export default function ItemEditorModal({ 
  open, 
  onClose, 
  item, 
  categories = [],
  onSave,
  loading = false
}) {
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
    list_price: '',
    stock_quantity: 0,
    track_stock: false,
  });

  useEffect(() => {
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
        list_price: item.list_price?.toString() || '',
        stock_quantity: item.stock_quantity || 0,
        track_stock: item.track_stock || false,
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        barcode: '',
        category_id: NO_CATEGORY_VALUE,
        price: '',
        presentation_quantity: '',
        presentation_unit: '',
        brand: '',
        list_price: '',
            stock_quantity: 0,
        track_stock: false,
          });
    }
  }, [item, open]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isSepaItem) {
      const nextPrice = formData.price === '' ? null : parseFloat(formData.price);
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
      list_price: formData.list_price ? parseFloat(formData.list_price) : null,
      stock_quantity: parseInt(formData.stock_quantity) || 0
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {item ? (isSepaItem ? 'Editar precio SEPA' : 'Edit Item') : 'Add New Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {isSepaItem ? (
              <>
                <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Solo podés modificar el precio final para ítems con origen SEPA.
                </div>
                <div className="col-span-2">
                  <Label htmlFor="price">Precio final (vacío = precio original SEPA)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    autoFocus
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
              <Label htmlFor="name">Name *</Label>
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
              <Label htmlFor="sku">SKU (auxiliar)</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Opcional, para referencia interna"
              />
            </div>

            <div>
              <Label htmlFor="barcode">Código de barras</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Principal para escaneo/sincronización"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY_VALUE}>No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="price">Price *</Label>
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

            {/* <div className="col-span-2 flex items-center justify-between py-2">
              <Label htmlFor="track_stock" className="cursor-pointer">Track Stock</Label>
              <Switch
                id="track_stock"
                checked={formData.track_stock}
                onCheckedChange={(checked) => setFormData({ ...formData, track_stock: checked })}
              />
            </div> */}

            {formData.track_stock && (
              <div className="col-span-2">
                <Label htmlFor="stock_quantity">Stock Quantity</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                />
              </div>
            )}
            </>
            )}
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t">
            <div className="flex gap-3 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {item ? (isSepaItem ? 'Guardar precio' : 'Update') : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
