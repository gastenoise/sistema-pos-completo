import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, ArrowRight, Check, AlertCircle, Loader2 } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const REQUIRED_FIELDS = ['name', 'price'];
const OPTIONAL_FIELDS = [
  'barcode',
  'sku',
  'category',
  'cost',
  'stock_quantity',
  'presentation_quantity',
  'presentation_unit',
  'brand',
  'list_price'
];
const SKIP_OPTION_VALUE = '__skip__';

export default function CsvImportWizard({ 
  open, 
  onClose,
  onPreview,
  onConfirm,
  categories = [],
  previewData = null,
  loading = false
}) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [mapping, setMapping] = useState({});
  const [globalCategoryId, setGlobalCategoryId] = useState('__none__');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      }
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadPreview = async () => {
    if (!file) return;
    await onPreview(file);
    setStep(2);
  };

  const handleConfirmImport = async () => {
    const resolvedCategoryId = globalCategoryId === '__none__'
      ? undefined
      : (globalCategoryId === '__uncategorized__' ? null : Number(globalCategoryId));

    await onConfirm(mapping, resolvedCategoryId);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setMapping({});
    setGlobalCategoryId('__none__');
    onClose();
  };

  const updateMapping = (field, column) => {
    setMapping(prev => ({
      ...prev,
      [field]: column === SKIP_OPTION_VALUE ? '' : column
    }));
  };

  const csvColumns = previewData?.columns || [];
  const previewRows = previewData?.sample || [];
  const parsingErrors = previewData?.parsing_errors || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Items from CSV
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200'
            }`}>
              1
            </div>
            <span className="text-sm font-medium">Upload</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200'
            }`}>
              2
            </div>
            <span className="text-sm font-medium">Map Columns</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200'
            }`}>
              3
            </div>
            <span className="text-sm font-medium">Confirm</span>
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <p className="text-sm text-slate-600 mb-2">
                Drag and drop your CSV file here, or
              </p>
              <Label htmlFor="csv-file" className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">browse</span>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </Label>
              {file && (
                <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleUploadPreview} disabled={!file || loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Preview
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === 2 && previewData && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-medium mb-3">Map CSV columns to item fields</p>
              <div className="grid grid-cols-2 gap-4">
                {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map((field) => (
                  <div key={field} className="flex items-center gap-2">
                    <Label className="w-28 text-sm capitalize">
                      {field.replace('_', ' ')}
                      {REQUIRED_FIELDS.includes(field) && <span className="text-red-500">*</span>}
                    </Label>
                    <Select 
                      value={mapping[field] || ''} 
                      onValueChange={(value) => updateMapping(field, value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP_OPTION_VALUE}>-- Skip --</SelectItem>
                        {csvColumns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>


            {parsingErrors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">CSV parsing warnings</p>
                    <p className="text-xs text-amber-700">{parsingErrors.length} rows were skipped due to invalid structure.</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Preview (first 5 rows)</p>
              <div className="border rounded-lg overflow-auto max-h-48">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {csvColumns.map((col) => (
                        <TableHead key={col} className="text-xs">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i}>
                        {csvColumns.map((col) => (
                          <TableCell key={col} className="text-xs">{row[col]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={!mapping.name || !mapping.price}
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Ready to import</p>
                  <p className="text-sm text-green-700">
                    {previewData?.total_rows || 0} ítems se importarán priorizando código de barras y usando SKU como auxiliar
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Column Mapping</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(mapping).filter(([_, v]) => v).map(([field, column]) => (
                  <div key={field} className="flex justify-between">
                    <span className="text-slate-600 capitalize">{field.replace('_', ' ')}:</span>
                    <span className="font-medium">{column}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <Label className="text-sm font-medium">Categoría global (opcional)</Label>
              <Select value={globalCategoryId} onValueChange={setGlobalCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="No aplicar categoría global" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No aplicar categoría global</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                  ))}
                  <SelectItem value="__uncategorized__">Sin categoría</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleConfirmImport} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Import Items
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
