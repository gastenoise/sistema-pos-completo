import { it as test } from 'vitest';
import assert from 'node:assert/strict';

import { buildItemsQueryOptions, invalidateItemsQueries, itemsQueryKey } from './itemsQueryOptions';

test('items hook query options: success scenario', async () => {
  const calls = [];
  const options = buildItemsQueryOptions({
    businessId: 7,
    searchQuery: 'yerba',
    barcodeOrSku: '779',
    categoryFilter: 'all',
    source: 'all',
    onlyPriceUpdated: false,
    page: 2,
  }, {
    getItems: async (params) => {
      calls.push(params);
      return { success: true };
    }
  });

  assert.deepEqual(options.queryKey, itemsQueryKey(7, 'yerba', '779', 'all', 'all', false, 2));
  assert.equal(options.enabled, true);

  await options.queryFn();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].per_page, 20);
});

test('items hook query options: disabled/error-ready scenario when no businessId', () => {
  const options = buildItemsQueryOptions({
    businessId: null,
    searchQuery: '',
    barcodeOrSku: '',
    categoryFilter: 'all',
    source: 'all',
    onlyPriceUpdated: false,
    page: 1,
  }, { getItems: null as any });

  assert.equal(options.enabled, false);
});

test('items hook invalidation scenario', async () => {
  const invalidated = [];
  const queryClient = {
    invalidateQueries: async ({ queryKey }) => invalidated.push(queryKey),
  };

  await invalidateItemsQueries(queryClient, 5);
  assert.deepEqual(invalidated, [['items', 5]]);
});
