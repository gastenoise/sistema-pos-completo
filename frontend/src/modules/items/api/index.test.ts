import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '@/api/client';
import { getCategories, getItems } from './index';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

describe('modules/items/api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filtra params vacíos y normaliza paginación en getItems', async () => {
    request.mockResolvedValueOnce({
      data: [{ id: '1', category_id: '2', list_price: '1200' }],
      current_page: 1,
      last_page: 1,
      per_page: 20,
      total: 1,
      from: 1,
      to: 1,
      next_cursor: null,
    });

    const result = await getItems({ search: 'pan', category: 'all', page: 1, per_page: 20 });

    expect(request).toHaveBeenCalledWith('/protected/items?search=pan&page=1&per_page=20');
    expect(result.items[0].category_id).toBe(2);
    expect(result.pagination.total).toBe(1);
  });

  it('normaliza categories y castea id a number', async () => {
    request.mockResolvedValueOnce({ data: { categories: [{ id: '9', name: 'Kiosco' }] } });

    const categories = await getCategories();

    expect(categories).toEqual([{ id: 9, name: 'Kiosco', is_active: true }]);
  });
});
