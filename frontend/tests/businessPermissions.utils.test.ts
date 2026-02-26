import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPermissionChecker,
  normalizeBusinessPermissionsPayload,
} from '../src/hooks/businessPermissions.utils.js';

test('normalizeBusinessPermissionsPayload reads nested payload shape', () => {
  const payload = normalizeBusinessPermissionsPayload({
    data: {
      role: 'admin',
      permissions: {
        'cash_register.view': true,
      },
    },
  });

  assert.equal(payload.role, 'admin');
  assert.equal(payload.permissions['cash_register.view'], true);
});

test('createPermissionChecker validates permission flags', () => {
  const can = createPermissionChecker({
    'cash_register.open': true,
    'cash_register.close': false,
  });

  assert.equal(can('cash_register.open'), true);
  assert.equal(can('cash_register.close'), false);
  assert.equal(can('unknown.permission'), false);
});
