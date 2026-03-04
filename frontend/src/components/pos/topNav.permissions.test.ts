import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import { buildTopNavItems } from './topNav.permissions';
import { SETTINGS_PERMISSIONS_MANAGE_PERMISSION } from '@/lib/authorizationGuards';

describe('topNav.permissions', () => {
  it('TopNav oculta Caja cuando cash_register.view no está permitido', () => {
    const can = (permission) => permission === SETTINGS_PERMISSIONS_MANAGE_PERMISSION;

    const items = buildTopNavItems(can);

    assert.equal(items.some((item) => item.name === 'Caja'), false);
    assert.equal(items.some((item) => item.name === 'Ajustes'), true);
  });

  it('TopNav muestra Caja cuando cash_register.view está permitido', () => {
    const can = (permission) => permission === 'cash_register.view';

    const items = buildTopNavItems(can);

    assert.equal(items.some((item) => item.name === 'Caja'), true);
  });
});
