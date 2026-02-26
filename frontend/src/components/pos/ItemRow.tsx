import React from 'react';
import { Tag, Pencil } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from '@/components/ui/table';
import { useBusiness } from './BusinessContext';
import { formatPrice } from '@/lib/formatPrice';
import { getIconComponent } from '@/lib/iconCatalog';

export default function ItemRow({ 
  item, 
  categories = [],
  selected, 
  onSelect, 
  onEdit, 
  showCheckbox = true 
}) {
  const { currentBusiness } = useBusiness();

  const findCategory = () => categories.find((category) => String(category.id) === String(item.category_id));

  const getItemIcon = () => {
    const category = findCategory();
    const IconComponent = getIconComponent(category?.icon);
    return { Icon: IconComponent, color: category?.color || '#94a3b8' };
  };

  const { Icon: ItemIcon, color } = getItemIcon();

  return (
    <TableRow className="hover:bg-slate-50 transition-colors">
      <TableCell className="w-12 px-4 py-3">
        {showCheckbox ? (
          <Checkbox 
            checked={selected}
            onCheckedChange={onSelect}
          />
        ) : null}
      </TableCell>
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color + '20' }}
          >
            <ItemIcon className="w-5 h-5" style={{ color: color }} />
          </div>
          <div>
            <p className="font-medium text-slate-900">{item.name}</p>
            {item.barcode && (
              <p className="text-xs text-slate-500">CB: {item.barcode}</p>
            )}
            {item.sku && (
              <p className="text-xs text-slate-500">SKU (auxiliar): {item.sku}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="px-4 py-3">
        {item.category_id ? (
          <Badge variant="outline" className="gap-1">
            <Tag className="w-3 h-3" />
            {findCategory()?.name || 'Unknown'}
          </Badge>
        ) : (
          <span className="text-slate-400 text-sm">—</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3">
        <span className="text-sm text-slate-700">{item.brand || '—'}</span>
      </TableCell>
      <TableCell className="px-4 py-3">
        {item.presentation_quantity && item.presentation_unit
          ? <span className="text-sm text-slate-700">{Number(item.presentation_quantity).toFixed(2)} {item.presentation_unit}</span>
          : <span className="text-slate-400 text-sm">—</span>}
      </TableCell>
      <TableCell className="px-4 py-3 text-right font-medium text-slate-900">
        <div>{formatPrice(item.price, currentBusiness)}</div>
        {item.list_price !== null && item.list_price !== undefined && (
          <div className="text-xs text-slate-500">Lista: {formatPrice(item.list_price, currentBusiness)}</div>
        )}
      </TableCell>
      <TableCell className="px-4 py-3 text-center">
        {item.track_stock ? (
          <span className={item.stock_quantity <= 5 ? 'text-red-600 font-medium' : 'text-slate-600'}>
            {item.stock_quantity}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <Badge variant="outline">{item.source === 'sepa' ? 'SEPA' : 'Local'}</Badge>
        </div>
      </TableCell>
      <TableCell className="w-12 px-4 py-3 text-right">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
          <Pencil className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
