import { describe, it, expect, vi } from 'vitest';

import {
  handleItemsScanComplete,
  handlePendingItemsScanResolution,
  handlePendingPosScanResolution,
  handlePosScanComplete,
} from './scannerHandlers';

describe('POS scanner handling', () => {
  it('scan válido agrega item al carrito automáticamente', () => {
    const setBarcodeOrSkuQuery = vi.fn();
    const setPendingScannedCode = vi.fn();
    const addScannedItem = vi.fn().mockReturnValue(true);
    const invalidateItems = vi.fn();
    const items = [{ id: 1, barcode: '779123', name: 'Yerba' }];

    handlePosScanComplete({
      rawCode: '779123',
      hasPaymentDialogOpen: false,
      items,
      setBarcodeOrSkuQuery,
      setPendingScannedCode,
      addScannedItem,
      invalidateItems,
    });

    expect(setBarcodeOrSkuQuery).toHaveBeenCalledWith('779123');
    expect(addScannedItem).toHaveBeenCalledWith('779123', items[0]);
    expect(setPendingScannedCode).toHaveBeenCalledWith(null);
    expect(invalidateItems).not.toHaveBeenCalled();
  });

  it('no actúa con showWizard abierto', () => {
    const setBarcodeOrSkuQuery = vi.fn();
    const setPendingScannedCode = vi.fn();
    const addScannedItem = vi.fn();
    const invalidateItems = vi.fn();

    handlePosScanComplete({
      rawCode: '779123',
      hasPaymentDialogOpen: true,
      items: [{ id: 1, barcode: '779123' }],
      setBarcodeOrSkuQuery,
      setPendingScannedCode,
      addScannedItem,
      invalidateItems,
    });

    expect(setBarcodeOrSkuQuery).not.toHaveBeenCalled();
    expect(setPendingScannedCode).not.toHaveBeenCalled();
    expect(addScannedItem).not.toHaveBeenCalled();
    expect(invalidateItems).not.toHaveBeenCalled();
  });
});

describe('Items scanner handling', () => {
  it('scan válido setea barcodeOrSkuQuery y resetea página', () => {
    const setPendingScannedCode = vi.fn();
    const invalidateItems = vi.fn();
    const setBarcodeOrSkuQuery = vi.fn();
    const setSearchQuery = vi.fn();
    const setPage = vi.fn();
    const focusAndHighlightBarcodeInput = vi.fn();
    const items = [{ id: 1, barcode: 'ABC123' }];

    handleItemsScanComplete({
      rawCode: 'ABC123',
      items,
      setPendingScannedCode,
      hasOffsetPagination: true,
      currentPage: 4,
      setBarcodeOrSkuQuery,
      setSearchQuery,
      setPage,
      focusAndHighlightBarcodeInput,
      invalidateItems,
    });

    expect(setBarcodeOrSkuQuery).toHaveBeenCalledWith('ABC123');
    expect(setSearchQuery).toHaveBeenCalledWith('');
    expect(setPage).toHaveBeenCalledWith(1);
    expect(setPendingScannedCode).toHaveBeenCalledWith(null);
    expect(invalidateItems).not.toHaveBeenCalled();
    expect(focusAndHighlightBarcodeInput).toHaveBeenCalledTimes(1);
  });
});

describe('Items pending scanner resolution', () => {
  it('ejecuta callback cuando no hay match luego del refresh y limpia pending code', () => {
    const setPendingScannedCode = vi.fn();
    const onNoMatchFound = vi.fn();

    handlePendingItemsScanResolution({
      pendingScannedCode: '779999',
      items: [{ id: 1, barcode: '779123' }],
      setPendingScannedCode,
      onNoMatchFound,
    });

    expect(setPendingScannedCode).toHaveBeenCalledWith(null);
    expect(onNoMatchFound).toHaveBeenCalledWith('779999');
  });
});

describe('POS pending scanner resolution', () => {
  it('ejecuta callback cuando no hay match luego del refresh y limpia pending code', () => {
    const addScannedItem = vi.fn();
    const setPendingScannedCode = vi.fn();
    const onNoMatchFound = vi.fn();

    handlePendingPosScanResolution({
      pendingScannedCode: '779999',
      items: [{ id: 1, barcode: '779123' }],
      addScannedItem,
      setPendingScannedCode,
      onNoMatchFound,
    });

    expect(addScannedItem).not.toHaveBeenCalled();
    expect(setPendingScannedCode).toHaveBeenCalledWith(null);
    expect(onNoMatchFound).toHaveBeenCalledWith('779999');
  });
});
