import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '@/api/client';
import { closeCashRegister, getCashRegisterStatus } from './index';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

describe('modules/cash-register/api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve null cuando caja está cerrada', async () => {
    request.mockResolvedValueOnce({ status: 'closed' });
    await expect(getCashRegisterStatus()).resolves.toBeNull();
  });

  it('normaliza apertura de caja desde payload legacy', async () => {
    request.mockResolvedValueOnce({ data: { is_open: true, session: { id: 5, opened_at: 'now' } } });

    await expect(getCashRegisterStatus()).resolves.toEqual({ status: 'open', id: 5, opened_at: 'now' });
  });

  it('castea realCash a number al cerrar', async () => {
    request.mockResolvedValueOnce({ ok: true });
    await closeCashRegister('1500.75');

    expect(request).toHaveBeenCalledWith('/protected/cash-register/close', {
      method: 'POST',
      body: { real_cash: 1500.75 }
    });
  });
});
