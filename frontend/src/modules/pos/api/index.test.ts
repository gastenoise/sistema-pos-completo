import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/api/client';
import { getBankAccount, getPosItems, getPosPaymentMethods, startSale, closeSale } from './index';

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

  it('normalizes startSale response', async () => {
    const mockSale = { id: 1, total_amount: '100.00' };
    apiClient.post.mockResolvedValueOnce({ success: true, data: mockSale });

    const result = await startSale({});

    expect(result).toEqual(mockSale);
    expect(apiClient.post).toHaveBeenCalledWith('/protected/sales/start', {});
  });

  it('normalizes closeSale response', async () => {
    const mockResult = { success: true, message: 'Sale closed' };
    apiClient.post.mockResolvedValueOnce({ success: true, data: mockResult });

    const result = await closeSale(1, {});

    expect(result).toEqual(mockResult);
    expect(apiClient.post).toHaveBeenCalledWith('/protected/sales/1/close', {});
  });
});
