import React, { useState } from 'react';
import { X, Tag, TrendingUp, Loader2 } from 'lucide-react';
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

export default function BulkActionsBar({ 
  selectedCount, 
  onClear, 
  categories = [],
  onAssignCategory,
  onApplyPriceIncrease,
  loading = false
}) {
  const [priceIncrease, setPriceIncrease] = useState('');

  const handlePriceIncrease = () => {
    const percent = parseFloat(priceIncrease);
    if (!isNaN(percent) && percent !== 0) {
      onApplyPriceIncrease(percent);
      setPriceIncrease('');
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-blue-900">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClear}
          className="text-blue-700 hover:text-blue-900"
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Assign Category */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={loading}>
              <Tag className="w-4 h-4 mr-2" />
              Assign Category
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-2">
              <p className="text-sm font-medium">Select category</p>
              <Select onValueChange={(value) => onAssignCategory(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>

        {/* Price Increase */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={loading}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Price Increase
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-3">
              <p className="text-sm font-medium">Apply percentage increase</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 10"
                  value={priceIncrease}
                  onChange={(e) => setPriceIncrease(e.target.value)}
                  className="flex-1"
                />
                <span className="flex items-center text-slate-500">%</span>
              </div>
              <Button 
                onClick={handlePriceIncrease} 
                size="sm" 
                className="w-full"
                disabled={!priceIncrease || loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}