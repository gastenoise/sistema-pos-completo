import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import { canAccessRoute, canViewPermissionsTab } from './authorizationGuards';

describe('authorizationGuards', () => {
it('guard de ruta redirige desde /CashRegister cuando no tiene cash_register.view', () => {
  const can = () => false;

  assert.equal(canAccessRoute('CashRegister', can), false);
  assert.equal(canAccessRoute('POS', can), true);
});

it('visibilidad de pestaña Permisos solo owner/admin', () => {
  assert.equal(canViewPermissionsTab('owner'), true);
  assert.equal(canViewPermissionsTab('admin'), true);
  assert.equal(canViewPermissionsTab('cashier'), false);
});
});
