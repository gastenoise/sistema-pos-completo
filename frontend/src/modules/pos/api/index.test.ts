import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '@/api/client';
import { getBanks, getPaymentMethods, getPosItems } from './index';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

describe('modules/pos/api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('arma query para búsqueda de items POS', async () => {
    request.mockResolvedValueOnce({ data: { items: [] } });

    await getPosItems({ search: 'yerba', barcode: '123', limit: 10 });

    expect(request).toHaveBeenCalledWith('/protected/items?source=all&per_page=10&search=yerba&barcode=123');
  });

  it('normaliza payment methods y completa type', async () => {
    request.mockResolvedValueOnce({ data: { payment_methods: [{ code: 'cash', name: 'Efectivo' }] } });

    const methods = await getPaymentMethods();

    expect(methods).toEqual([{ code: 'cash', name: 'Efectivo', type: 'cash' }]);
  });

  it('resuelve payload de bancos con o sin wrapper data', async () => {
    request.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(getBanks()).resolves.toEqual([{ id: 1 }]);
  });
});
