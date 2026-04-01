import { describe, it, expect, vi } from 'vitest';

import { handleItemsScanComplete, handlePosScanComplete } from './scannerHandlers';

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
    const setBarcodeOrSkuQuery = vi.fn();
    const setSearchQuery = vi.fn();
    const setPage = vi.fn();
    const focusAndHighlightBarcodeInput = vi.fn();

    handleItemsScanComplete({
      rawCode: 'ABC123',
      hasOffsetPagination: true,
      currentPage: 4,
      setBarcodeOrSkuQuery,
      setSearchQuery,
      setPage,
      focusAndHighlightBarcodeInput,
    });

    expect(setBarcodeOrSkuQuery).toHaveBeenCalledWith('ABC123');
    expect(setSearchQuery).toHaveBeenCalledWith('');
    expect(setPage).toHaveBeenCalledWith(1);
    expect(focusAndHighlightBarcodeInput).toHaveBeenCalledTimes(1);
  });
});
