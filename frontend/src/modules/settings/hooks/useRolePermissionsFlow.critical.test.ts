import { describe, expect, it } from 'vitest';
import { CASH_REGISTER_PERMISSION_KEYS, SALES_PERMISSION_KEYS, ROLE_PERMISSIONS_MATRIX_KEYS } from './useRolePermissionsFlow';

describe('useRolePermissionsFlow permission matrix', () => {
  it('includes settings.permissions.manage and sales.void in payload matrix without changing cash-register UI keys', () => {
    expect(CASH_REGISTER_PERMISSION_KEYS).toEqual([
      'cash_register.view',
      'cash_register.open',
      'cash_register.close',
    ]);

    expect(SALES_PERMISSION_KEYS).toEqual([
      'sales.void',
    ]);

    expect(ROLE_PERMISSIONS_MATRIX_KEYS).toContain('settings.permissions.manage');
    expect(ROLE_PERMISSIONS_MATRIX_KEYS).toContain('sales.void');
    expect(new Set(ROLE_PERMISSIONS_MATRIX_KEYS).size).toBe(ROLE_PERMISSIONS_MATRIX_KEYS.length);
  });
});
