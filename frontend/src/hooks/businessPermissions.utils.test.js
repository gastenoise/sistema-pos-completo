import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPermissionChecker,
  normalizeBusinessPermissionsPayload,
} from './businessPermissions.utils.js';

test('normalizeBusinessPermissionsPayload normaliza role y permissions desde response.data', () => {
  const result = normalizeBusinessPermissionsPayload({
    data: {
      role: 'cashier',
      permissions: {
        'cash_register.view': true,
        'cash_register.open': false,
      },
    },
  });

  assert.equal(result.role, 'cashier');
  assert.equal(result.permissions['cash_register.view'], true);
  assert.equal(result.permissions['cash_register.open'], false);
});

test('createPermissionChecker devuelve false para permisos ausentes', () => {
  const can = createPermissionChecker({
    'cash_register.view': true,
  });

  assert.equal(can('cash_register.view'), true);
  assert.equal(can('cash_register.open'), false);
});
