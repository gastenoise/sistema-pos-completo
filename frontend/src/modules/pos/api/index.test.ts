import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/api/client';
import { getBankAccount, getPosItems, getPosPaymentMethods } from './index';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('modules/pos/api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('arma query para búsqueda de items POS', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { items: [] } });

    await getPosItems({ searchQuery: 'yerba', barcodeOrSkuQuery: '123' });

    expect(apiClient.get).toHaveBeenCalledWith('/protected/items?source=all&per_page=24&search=yerba&barcode_or_sku=123');
  });

  it('normaliza payment methods y completa type', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { payment_methods: [{ code: 'cash', name: 'Efectivo' }] } });

    const methods = await getPosPaymentMethods();

    expect(methods).toEqual([{ code: 'cash', name: 'Efectivo', type: 'cash' }]);
  });

  it('resuelve payload de bancos con o sin wrapper data', async () => {
    apiClient.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(getBankAccount()).resolves.toEqual([{ id: 1 }]);
  });
});
