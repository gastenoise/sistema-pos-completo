import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTopNavItems } from './topNav.permissions';

test('TopNav oculta Caja cuando cash_register.view no está permitido', () => {
  const can = (permission) => permission === 'settings.permissions.manage';

  const items = buildTopNavItems(can);

  assert.equal(items.some((item) => item.name === 'Caja'), false);
  assert.equal(items.some((item) => item.name === 'Ajustes'), true);
});

test('TopNav muestra Caja cuando cash_register.view está permitido', () => {
  const can = (permission) => permission === 'cash_register.view';

  const items = buildTopNavItems(can);

  assert.equal(items.some((item) => item.name === 'Caja'), true);
});
