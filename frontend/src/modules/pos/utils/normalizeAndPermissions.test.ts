import { it as test } from 'vitest';
import assert from 'node:assert/strict';

import { canOperatePos, normalizePosCatalogItems } from './normalizeAndPermissions';

test('normalización modular de POS filtra inactivos y setea source por defecto', () => {
  const normalized = normalizePosCatalogItems([
    { id: 1, name: 'A', is_active: true, source: 'sepa' },
    { id: 2, name: 'B', is_active: false },
    { id: 3, name: 'C' },
  ]);

  assert.equal(normalized.length, 2);
  assert.equal(normalized[1].source, 'local');
});

test('permisos modulares de POS validan escenarios permitido/no permitido', () => {
  assert.equal(canOperatePos({ 'sales.view': true }), true);
  assert.equal(canOperatePos({ 'sales.manage': true }), true);
  assert.equal(canOperatePos({}), false);
});
