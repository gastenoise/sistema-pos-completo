import { describe, it, expect, vi } from 'vitest';
import * as api from '../api';

import {
  handleItemsScanComplete,
  handlePosScanComplete,
} from './scannerHandlers';

vi.mock('../api', () => ({
  getPosItemByBarcode: vi.fn(),
}));

describe('POS scanner handling', () => {
  it('scan válido agrega item al carrito automáticamente si está en la lista local', async () => {
    const addScannedItem = vi.fn().mockReturnValue(true);
    const onNoMatchFound = vi.fn();
    const items = [{ id: 1, barcode: '779123', name: 'Yerba' }];

    await handlePosScanComplete({
      rawCode: '779123',
      hasPaymentDialogOpen: false,
      items,
      addScannedItem,
      onNoMatchFound,
    });

    expect(addScannedItem).toHaveBeenCalledWith('779123', items[0]);
    expect(onNoMatchFound).not.toHaveBeenCalled();
  });

  it('scan válido agrega item al carrito vía API si no está en la lista local', async () => {
    const addScannedItem = vi.fn().mockReturnValue(true);
    const onNoMatchFound = vi.fn();
    const items: any[] = [];
    const apiItem = { id: 2, barcode: '779456', name: 'Leche' };

    vi.mocked(api.getPosItemByBarcode).mockResolvedValue(apiItem);

    await handlePosScanComplete({
      rawCode: '779456',
      hasPaymentDialogOpen: false,
      items,
      addScannedItem,
      onNoMatchFound,
    });

    expect(api.getPosItemByBarcode).toHaveBeenCalledWith('779456');
    expect(addScannedItem).toHaveBeenCalledWith('779456', apiItem);
    expect(onNoMatchFound).not.toHaveBeenCalled();
  });

  it('ejecuta onNoMatchFound si no se encuentra en local ni en API', async () => {
    const addScannedItem = vi.fn();
    const onNoMatchFound = vi.fn();
    const items: any[] = [];

    vi.mocked(api.getPosItemByBarcode).mockResolvedValue(null);

    await handlePosScanComplete({
      rawCode: '999999',
      hasPaymentDialogOpen: false,
      items,
      addScannedItem,
      onNoMatchFound,
    });

    expect(addScannedItem).not.toHaveBeenCalled();
    expect(onNoMatchFound).toHaveBeenCalledWith('999999');
  });

  it('no actúa con showWizard abierto', async () => {
    const addScannedItem = vi.fn();
    const onNoMatchFound = vi.fn();

    await handlePosScanComplete({
      rawCode: '779123',
      hasPaymentDialogOpen: true,
      items: [{ id: 1, barcode: '779123' }],
      addScannedItem,
      onNoMatchFound,
    });

    expect(addScannedItem).not.toHaveBeenCalled();
  });
});

describe('Items scanner handling', () => {
  it('scan válido llama a onMatchFound con item local', async () => {
    const onMatchFound = vi.fn();
    const onNoMatchFound = vi.fn();
    const items = [{ id: 1, barcode: 'ABC123' }];

    await handleItemsScanComplete({
      rawCode: 'ABC123',
      items,
      onMatchFound,
      onNoMatchFound,
    });

    expect(onMatchFound).toHaveBeenCalledWith(items[0]);
    expect(onNoMatchFound).not.toHaveBeenCalled();
  });

  it('scan válido llama a onMatchFound con item de API', async () => {
    const onMatchFound = vi.fn();
    const onNoMatchFound = vi.fn();
    const items: any[] = [];
    const apiItem = { id: 3, barcode: 'XYZ789' };

    vi.mocked(api.getPosItemByBarcode).mockResolvedValue(apiItem);

    await handleItemsScanComplete({
      rawCode: 'XYZ789',
      items,
      onMatchFound,
      onNoMatchFound,
    });

    expect(onMatchFound).toHaveBeenCalledWith(apiItem);
    expect(onNoMatchFound).not.toHaveBeenCalled();
  });

  it('llama a onNoMatchFound si no existe', async () => {
    const onMatchFound = vi.fn();
    const onNoMatchFound = vi.fn();
    const items: any[] = [];

    vi.mocked(api.getPosItemByBarcode).mockResolvedValue(null);

    await handleItemsScanComplete({
      rawCode: 'NONEXISTENT',
      items,
      onMatchFound,
      onNoMatchFound,
    });

    expect(onMatchFound).not.toHaveBeenCalled();
    expect(onNoMatchFound).toHaveBeenCalledWith('NONEXISTENT');
  });
});
