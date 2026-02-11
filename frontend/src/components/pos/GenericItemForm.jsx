import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function GenericItemForm({ onAdd, categories = [], categoryRequired = false }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    price: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.price || (categoryRequired && !formData.category_id)) return;

    const selectedCategory = categories.find((category) => String(category.id) === String(formData.category_id));
    const customLabel = selectedCategory?.name || 'Ítem personalizado';
    
    setLoading(true);
    try {
      await onAdd({
        id: `custom-${Date.now()}`,
        name: customLabel,
        price: parseFloat(formData.price),
        is_custom: true,
        custom_label: customLabel,
        category_id: formData.category_id ? Number(formData.category_id) : null
      });
      toast.success('Ítem efímero agregado');
      setFormData({ category_id: '', price: '' });
      setOpen(false);
    } catch (error) {
      toast.error('No se pudo agregar el ítem efímero');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Custom Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar línea efímera</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Categoría {categoryRequired ? '*' : '(opcional)'}</Label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoFocus
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Monto</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={loading || !formData.price || (categoryRequired && !formData.category_id)}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Agregar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
