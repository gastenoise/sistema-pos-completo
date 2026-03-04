import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import {
  canAccessRoute,
  canViewPermissionsTab,
  ROUTE_PERMISSIONS,
  SETTINGS_PERMISSIONS_MANAGE_PERMISSION,
} from './authorizationGuards';

describe('authorizationGuards', () => {
  it('guard de ruta redirige desde /CashRegister cuando no tiene cash_register.view', () => {
    const can = () => false;

    assert.equal(canAccessRoute('CashRegister', can), false);
    assert.equal(canAccessRoute('POS', can), true);
  });

  it('usa permiso settings.permissions.manage para tab y route guard de Settings', () => {
    const canOnlySettings = (permission) => permission === SETTINGS_PERMISSIONS_MANAGE_PERMISSION;

    assert.equal(canViewPermissionsTab({ can: canOnlySettings, role: 'cashier' }), true);
    assert.equal(canAccessRoute('Settings', canOnlySettings), true);
    assert.equal(ROUTE_PERMISSIONS.Settings, SETTINGS_PERMISSIONS_MANAGE_PERMISSION);
  });

  it('owner solo mantiene bypass si se habilita explícitamente', () => {
    const can = () => false;

    assert.equal(canViewPermissionsTab({ can, role: 'owner' }), false);
    assert.equal(
      canViewPermissionsTab({ can, role: 'owner', allowOwnerOverride: true }),
      true,
    );
  });
});
