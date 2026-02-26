import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '@/api/client';
import { getReportCategories, getSalesSummary } from './index';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

describe('modules/reports/api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('arma query de summary con filtros opcionales', async () => {
    request.mockResolvedValueOnce({ data: { total: 1000 } });

    const result = await getSalesSummary({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      paymentMethod: 'cash',
      categoryId: 3,
    });

    expect(request).toHaveBeenCalledWith('/protected/reports/summary?start_date=2026-01-01&end_date=2026-01-31&payment_method=cash&category_id=3');
    expect(result).toEqual({ total: 1000 });
  });

  it('normaliza categories para reportes', async () => {
    request.mockResolvedValueOnce({ data: { categories: [{ id: '4', name: 'Almacén' }] } });

    await expect(getReportCategories()).resolves.toEqual([{ id: 4, name: 'Almacén', is_active: true }]);
  });
});
