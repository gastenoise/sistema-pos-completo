import { it as test } from 'vitest';
import assert from 'node:assert/strict';

import {
  buildPosItemsQueryOptions,
  invalidatePosQueries,
  posItemsQueryKey,
} from './posQueryOptions';

test('pos hook: success scenario', async () => {
  let payload = null;
  const options = buildPosItemsQueryOptions(2, { search: 'leche', barcode: '', limit: 30 }, {
    getPosItems: async (params) => {
      payload = params;
      return [];
    }
  });

  assert.deepEqual(options.queryKey, posItemsQueryKey(2, 'leche', '', 30));
  assert.equal(options.enabled, true);
  await options.queryFn();
  assert.deepEqual(payload, { search: 'leche', barcode: '', limit: 30 });
});

test('pos hook: disabled/error-ready scenario', () => {
  const options = buildPosItemsQueryOptions(2, { search: ' ', barcode: ' ', limit: 20 }, { getPosItems: null as any });
  assert.equal(options.enabled, false);
});

test('pos hook: invalidation scenario', async () => {
  const keys = [];
  const queryClient = {
    invalidateQueries: async ({ queryKey }) => keys.push(queryKey),
  };

  await invalidatePosQueries(queryClient, 2);

  assert.deepEqual(keys, [
    ['pos-items', 2],
    ['latest-closed-sale', 2],
  ]);
});
