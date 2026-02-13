import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getIconComponent, getIconOptions, resolveIconName } from '@/lib/iconCatalog';

export default function IconPickerField({
  value,
  onChange,
  iconCatalog,
  id = 'icon',
  label = 'Ícono',
}) {
  const safeIconName = useMemo(() => resolveIconName(value, iconCatalog), [value, iconCatalog]);
  const IconComponent = useMemo(() => getIconComponent(safeIconName, iconCatalog), [safeIconName, iconCatalog]);
  const iconOptions = useMemo(() => getIconOptions(iconCatalog), [iconCatalog]);

  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-trigger`} className="text-sm font-medium leading-none">
        {label}
      </label>

      <Popover>
        <PopoverTrigger asChild>
          <Button id={`${id}-trigger`} type="button" variant="outline" className="w-full justify-between">
            <span className="inline-flex items-center gap-2">
              <IconComponent className="h-4 w-4" />
              <span className="text-xs">{safeIconName}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-3">
          <div className="grid max-h-56 grid-cols-5 gap-2 overflow-y-auto pr-1">
            {iconOptions.map((option) => {
              const OptionIcon = getIconComponent(option.name, iconCatalog);
              const isSelected = safeIconName === option.name;
              return (
                <button
                  key={option.name}
                  type="button"
                  className={`rounded-lg border p-2 text-slate-700 hover:bg-slate-50 ${isSelected ? 'border-blue-500 bg-blue-100' : 'border-slate-200'}`}
                  onClick={() => onChange(option.name)}
                  aria-label={`Seleccionar ${option.name}`}
                  title={option.name}
                >
                  <OptionIcon className="mx-auto h-5 w-5" />
                  <span className="mt-1 block truncate text-[10px]">{option.name}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
