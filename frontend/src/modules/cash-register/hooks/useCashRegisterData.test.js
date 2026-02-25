import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCashStatusQueryOptions,
  cashStatusQueryKey,
  invalidateCashRegisterQueries,
} from './cashRegisterQueryOptions.js';

test('cash-register hook: success scenario', async () => {
  let called = 0;
  const options = buildCashStatusQueryOptions(3, true, {
    getCashRegisterStatus: async () => {
      called += 1;
      return { status: 'open' };
    }
  });

  assert.deepEqual(options.queryKey, cashStatusQueryKey(3));
  assert.equal(options.enabled, true);
  await options.queryFn();
  assert.equal(called, 1);
});

test('cash-register hook: disabled/error-ready scenario', () => {
  const options = buildCashStatusQueryOptions(undefined, true, { getCashRegisterStatus: async () => ({}) });
  assert.equal(options.enabled, false);
});

test('cash-register hook: invalidation scenario', async () => {
  const keys = [];
  const queryClient = {
    invalidateQueries: async ({ queryKey }) => keys.push(queryKey),
  };

  await invalidateCashRegisterQueries(queryClient, 10);

  assert.deepEqual(keys, [
    ['cashSession', 10],
    ['recentSessions', 10],
  ]);
});
