import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '@/api/client';
import { getSmtpStatus, updateRolePermissions } from './index';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

describe('modules/settings/api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna data para smtp status cuando viene envuelto', async () => {
    request.mockResolvedValueOnce({ data: { configured: true } });
    await expect(getSmtpStatus()).resolves.toEqual({ configured: true });
  });

  it('envía payload de permisos con PUT', async () => {
    request.mockResolvedValueOnce({ ok: true });
    const payload = { admin: ['sales.view'] };

    await updateRolePermissions(payload);

    expect(request).toHaveBeenCalledWith('/protected/role-permissions', {
      method: 'PUT',
      body: payload,
    });
  });
});
