import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { normalizeHexColor, RECOMMENDED_HEX_COLORS } from '@/lib/colors';

export default function ColorPickerField({
  value,
  onChange,
  id = 'color',
  label = 'Color',
  recommendedColors = RECOMMENDED_HEX_COLORS,
}) {
  const safeValue = useMemo(() => normalizeHexColor(value), [value]);

  const handleColorChange = (nextValue) => {
    onChange(normalizeHexColor(nextValue));
  };

  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-hex`} className="text-sm font-medium leading-none">
        {label}
      </label>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between">
            <span className="inline-flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full border border-slate-300"
                style={{ backgroundColor: safeValue }}
                aria-hidden="true"
              />
              <span className="font-mono text-xs">{safeValue}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-3">
          <div className="grid grid-cols-8 gap-2">
            {recommendedColors.map((color) => {
              const normalized = normalizeHexColor(color);
              return (
                <button
                  key={normalized}
                  type="button"
                  className={`h-7 w-7 rounded-full border ${safeValue === normalized ? 'ring-2 ring-offset-2 ring-slate-500' : 'border-slate-200'}`}
                  style={{ backgroundColor: normalized }}
                  onClick={() => handleColorChange(normalized)}
                  aria-label={`Seleccionar ${normalized}`}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={safeValue}
              onChange={(event) => handleColorChange(event.target.value)}
              className="h-10 w-12 p-1"
              aria-label="Selector visual de color"
            />
            <Input
              id={`${id}-hex`}
              value={safeValue}
              onChange={(event) => handleColorChange(event.target.value)}
              maxLength={7}
              placeholder="#3B82F6"
              className="font-mono"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
