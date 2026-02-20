import test from 'node:test';
import assert from 'node:assert/strict';

import { canVoidSales } from './canVoidSales.js';

test('canVoidSales devuelve true cuando el rol admin viene del contexto fresco del backend', () => {
  const currentBusiness = { id: 7 };
  const businesses = [{ id: 7, role: 'cashier' }];
  const userContext = {
    activeBusinessRole: 'admin',
    businesses: [{ id: 7, pivot: { role: 'admin' } }],
  };

  assert.equal(canVoidSales(currentBusiness, businesses, userContext), true);
});

test('canVoidSales devuelve false cuando no hay rol admin para el negocio activo', () => {
  const currentBusiness = { business_id: 9 };
  const businesses = [{ id: 9, pivot: { role: 'cashier' } }];
  const userContext = {
    businesses: [{ id: 9, pivot: { role: 'cashier' } }],
  };

  assert.equal(canVoidSales(currentBusiness, businesses, userContext), false);
});
