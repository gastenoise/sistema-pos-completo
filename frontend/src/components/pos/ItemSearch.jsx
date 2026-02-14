import React, { useState, useRef, useEffect } from 'react';
import { Search, Package, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { useBusiness } from './BusinessContext';
import { formatPrice } from '@/lib/formatPrice';

export default function ItemSearch({ 
  items = [], 
  onSelect, 
  loading = false,
  placeholder = "Buscar por nombre, código de barras o SKU..."
}) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const { currentBusiness } = useBusiness();

  const filteredItems = items.filter(item => {
    if (!query) return false;
    const q = query.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q) ||
      item.barcode?.includes(q)
    );
  }).slice(0, 10);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (!showResults || filteredItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        break;
    }
  };

  const handleSelect = (item) => {
    onSelect(item);
    setQuery('');
    setShowResults(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          onKeyDown={handleKeyDown}
          className="pl-10 h-12 text-lg"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-slate-400" />
        )}
      </div>

      {showResults && filteredItems.length > 0 && (
        <div 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {filteredItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                index === selectedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{item.name}</p>
                {item.barcode && (
                  <p className="text-xs text-slate-500">Código de barras: {item.barcode}</p>
                )}
                {item.sku && (
                  <p className="text-xs text-slate-500">SKU (aux): {item.sku}</p>
                )}
              </div>
              <span className="font-bold text-blue-600">{formatPrice(item.price, currentBusiness)}</span>
            </button>
          ))}
        </div>
      )}

      {showResults && query && filteredItems.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-4 text-center text-slate-500">
          No items found for "{query}"
        </div>
      )}
    </div>
  );
}
