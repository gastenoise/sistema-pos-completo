export const findExactItemMatch = (code: string, list: any[] = []) => {
  const normalizedCode = String(code ?? '').trim().toLowerCase();
  if (!normalizedCode) {
    return null;
  }

  const matches = list.filter((item) => {
    const barcode = String(item?.barcode ?? '').trim().toLowerCase();
    const sku = String(item?.sku ?? '').trim().toLowerCase();
    return barcode === normalizedCode || sku === normalizedCode;
  });

  if (matches.length !== 1) {
    return null;
  }

  return matches[0];
};

export const handlePosScanComplete = ({
  rawCode,
  hasPaymentDialogOpen,
  items,
  setBarcodeOrSkuQuery,
  setPendingScannedCode,
  addScannedItem,
  invalidateItems,
}: {
  rawCode: string;
  hasPaymentDialogOpen: boolean;
  items: any[];
  setBarcodeOrSkuQuery: (code: string) => void;
  setPendingScannedCode: (code: string | null) => void;
  addScannedItem: (code: string, item: any) => boolean;
  invalidateItems: () => void;
}) => {
  if (hasPaymentDialogOpen) {
    return;
  }

  const code = String(rawCode ?? '').trim();
  if (!code) {
    return;
  }

  setBarcodeOrSkuQuery(code);
  const localMatch = findExactItemMatch(code, items);

  if (localMatch) {
    addScannedItem(code, localMatch);
    setPendingScannedCode(null);
    return;
  }

  setPendingScannedCode(code);
  invalidateItems();
};

export const handlePendingPosScanResolution = ({
  pendingScannedCode,
  items,
  addScannedItem,
  setPendingScannedCode,
  onNoMatchFound,
}: {
  pendingScannedCode: string | null;
  items: any[];
  addScannedItem: (code: string, item: any) => boolean;
  setPendingScannedCode: (code: string | null) => void;
  onNoMatchFound?: (code: string) => void;
}) => {
  if (!pendingScannedCode) {
    return;
  }

  const exactMatch = findExactItemMatch(pendingScannedCode, items);
  if (!exactMatch) {
    setPendingScannedCode(null);
    onNoMatchFound?.(pendingScannedCode);
    return;
  }

  const wasAdded = addScannedItem(pendingScannedCode, exactMatch);
  if (wasAdded) {
    setPendingScannedCode(null);
  }
};

export const handleItemsScanComplete = ({
  rawCode,
  items,
  setPendingScannedCode,
  hasOffsetPagination,
  currentPage,
  setBarcodeOrSkuQuery,
  setSearchQuery,
  setPage,
  focusAndHighlightBarcodeInput,
  invalidateItems,
}: {
  rawCode: string;
  items: any[];
  setPendingScannedCode: (code: string | null) => void;
  hasOffsetPagination: boolean;
  currentPage: number;
  setBarcodeOrSkuQuery: (code: string) => void;
  setSearchQuery: (value: string) => void;
  setPage: (page: number) => void;
  focusAndHighlightBarcodeInput: () => void;
  invalidateItems: () => void;
}) => {
  const code = String(rawCode ?? '').trim();
  if (!code) {
    return;
  }

  setBarcodeOrSkuQuery(code);
  setSearchQuery('');

  if (hasOffsetPagination && currentPage > 1) {
    setPage(1);
  }

  const localMatch = findExactItemMatch(code, items);
  if (localMatch) {
    setPendingScannedCode(null);
    focusAndHighlightBarcodeInput();
    return;
  }

  setPendingScannedCode(code);
  invalidateItems();
  focusAndHighlightBarcodeInput();
};

export const handlePendingItemsScanResolution = ({
  pendingScannedCode,
  items,
  setPendingScannedCode,
  onNoMatchFound,
}: {
  pendingScannedCode: string | null;
  items: any[];
  setPendingScannedCode: (code: string | null) => void;
  onNoMatchFound?: (code: string) => void;
}) => {
  if (!pendingScannedCode) {
    return;
  }

  const exactMatch = findExactItemMatch(pendingScannedCode, items);
  if (!exactMatch) {
    setPendingScannedCode(null);
    onNoMatchFound?.(pendingScannedCode);
    return;
  }

  setPendingScannedCode(null);
};
