import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function QuickAddForm({ onAdd, loading = false }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    type: 'product'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;
    
    setIsLoading(true);
    try {
      await onAdd({
        name: formData.name,
        price: parseFloat(formData.price),
        type: formData.type
      });
      toast.success('Item agregado');
      setFormData({ name: '', price: '', type: 'product' });
      setOpen(false);
    } catch (error) {
      toast.error('No se pudo agregar el item');
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitting = loading || isLoading;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="w-4 h-4" />
          Quick Add
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="font-medium text-sm">Quick Add Item</p>
          
          <Input
            placeholder="Item name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />
          
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Price"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          />
          
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
          
          <Button type="submit" className="w-full" disabled={isSubmitting || !formData.name || !formData.price}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add & Add to Cart
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
