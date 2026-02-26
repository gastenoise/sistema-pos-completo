import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/api/client';
import { getSmtpConfig, updateRolePermissions } from './index';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('modules/settings/api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna data para smtp status cuando viene envuelto', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { configured: true } });
    await expect(getSmtpConfig()).resolves.toEqual({ configured: true });
  });

  it('envía payload de permisos con PUT', async () => {
    apiClient.put.mockResolvedValueOnce({ ok: true });
    const payload = { admin: ['sales.view'] };

    await updateRolePermissions(payload);

    expect(apiClient.put).toHaveBeenCalledWith('/protected/role-permissions', payload);
  });
});
