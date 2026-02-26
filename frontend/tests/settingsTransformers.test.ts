import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCategoryCacheUpdate,
  settingsInvalidationKeys,
} from '../src/modules/settings/utils/settingsTransformers.js';

test('applyCategoryCacheUpdate upserts entity responses in category cache', () => {
  let cache = [{ id: 1, name: 'Bebidas' }];
  const queryClient = {
    setQueryData: (_key, updater) => {
      cache = typeof updater === 'function' ? updater(cache) : updater;
    },
  };

  const updated = applyCategoryCacheUpdate({
    queryClient,
    businessId: 10,
    response: { data: { id: 1, name: 'Snacks' } },
  });

  assert.equal(updated, true);
  assert.deepEqual(cache, [{ id: 1, name: 'Snacks', is_active: true }]);
});

test('settingsInvalidationKeys returns stable keys for critical settings queries', () => {
  const keys = settingsInvalidationKeys(7);
  assert.deepEqual(keys, [
    ['categories', 7],
    ['paymentMethods', 7],
    ['bankAccount', 7],
    ['smtpConfig', 7],
    ['rolePermissions', 7],
  ]);
});
