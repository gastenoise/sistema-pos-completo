import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeItemsPage } from './items.normalize.js';

test('normalizeItemsPage soporta Laravel Resource Collection (data + links + meta)', () => {
  const response = {
    data: {
      data: [
        { id: 11, name: 'Yerba', category_id: '5', list_price: '1200.50', source: 'local' },
        { id: 12, name: 'Azúcar', category_id: null, list_price: '900', source: 'sepa', sepa_item_id: '99' }
      ],
      links: {
        first: 'http://api.test/items?page=1',
        last: 'http://api.test/items?page=3',
        next: 'http://api.test/items?page=3',
        prev: 'http://api.test/items?page=1'
      },
      meta: {
        current_page: 2,
        last_page: 3,
        per_page: 20,
        total: 55,
        from: 21,
        to: 40
      }
    }
  };

  const result = normalizeItemsPage(response);

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].category_id, 5);
  assert.equal(result.items[1].sepa_item_id, 99);
  assert.deepEqual(result.pagination, {
    current_page: 2,
    last_page: 3,
    per_page: 20,
    total: 55,
    from: 21,
    to: 40,
    next_cursor: null
  });
});

test('normalizeItemsPage mantiene compatibilidad con payload legado', () => {
  const response = {
    data: [
      { id: 1, name: 'Pan', category_id: '3', list_price: '150' }
    ],
    current_page: 1,
    last_page: 5,
    per_page: 10,
    total: 50,
    from: 1,
    to: 10,
    next_cursor: 'cursor_2'
  };

  const result = normalizeItemsPage(response);

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].category_id, 3);
  assert.deepEqual(result.pagination, {
    current_page: 1,
    last_page: 5,
    per_page: 10,
    total: 50,
    from: 1,
    to: 10,
    next_cursor: 'cursor_2'
  });
});
