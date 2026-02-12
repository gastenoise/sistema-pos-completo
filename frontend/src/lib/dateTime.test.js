import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCurrentMonthRangeLocal,
  getLastNDaysRangeLocal,
  getTodayISODateLocal,
} from './dateTime.js';

test('getTodayISODateLocal uses browser/local calendar day at local midnight boundary', () => {
  const justBeforeMidnight = new Date(2025, 2, 31, 23, 59, 59);
  const midnight = new Date(2025, 3, 1, 0, 0, 0);

  assert.equal(getTodayISODateLocal(justBeforeMidnight), '2025-03-31');
  assert.equal(getTodayISODateLocal(midnight), '2025-04-01');
});

test('getLastNDaysRangeLocal handles month rollover with inclusive local dates', () => {
  const now = new Date(2025, 2, 1, 0, 5, 0);
  const range = getLastNDaysRangeLocal(7, now);

  assert.deepEqual(range, {
    startDate: '2025-02-22',
    endDate: '2025-03-01',
  });
});

test('getCurrentMonthRangeLocal handles year boundary correctly', () => {
  const now = new Date(2025, 11, 15, 12, 0, 0);
  const range = getCurrentMonthRangeLocal(now);

  assert.deepEqual(range, {
    startDate: '2025-12-01',
    endDate: '2025-12-31',
  });
});

test('getCurrentMonthRangeLocal handles leap year february', () => {
  const now = new Date(2024, 1, 29, 8, 30, 0);
  const range = getCurrentMonthRangeLocal(now);

  assert.deepEqual(range, {
    startDate: '2024-02-01',
    endDate: '2024-02-29',
  });
});
