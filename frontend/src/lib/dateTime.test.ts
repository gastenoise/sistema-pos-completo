import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  formatDateTimePartsLocal,
  getCurrentMonthRangeLocal,
  getLastNDaysRangeLocal,
  getTodayISODateLocal,
  parseBackendDateToUtcDate,
} from './dateTime';

describe('dateTime', () => {
it('getTodayISODateLocal uses browser/local calendar day at local midnight boundary', () => {
  const justBeforeMidnight = new Date(2025, 2, 31, 23, 59, 59);
  const midnight = new Date(2025, 3, 1, 0, 0, 0);

  assert.equal(getTodayISODateLocal(justBeforeMidnight), '2025-03-31');
  assert.equal(getTodayISODateLocal(midnight), '2025-04-01');
});

it('getLastNDaysRangeLocal handles month rollover with inclusive local dates', () => {
  const now = new Date(2025, 2, 1, 0, 5, 0);
  const range = getLastNDaysRangeLocal(7, now);

  assert.deepEqual(range, {
    startDate: '2025-02-22',
    endDate: '2025-03-01',
  });
});

it('getCurrentMonthRangeLocal handles year boundary correctly', () => {
  const now = new Date(2025, 11, 15, 12, 0, 0);
  const range = getCurrentMonthRangeLocal(now);

  assert.deepEqual(range, {
    startDate: '2025-12-01',
    endDate: '2025-12-31',
  });
});

it('getCurrentMonthRangeLocal handles leap year february', () => {
  const now = new Date(2024, 1, 29, 8, 30, 0);
  const range = getCurrentMonthRangeLocal(now);

  assert.deepEqual(range, {
    startDate: '2024-02-01',
    endDate: '2024-02-29',
  });
});

it('parseBackendDateToUtcDate parses SQL timestamp without timezone as UTC', () => {
  const parsedDate = parseBackendDateToUtcDate('2025-03-15 12:34:56');

  assert.ok(parsedDate instanceof Date);
  assert.equal(parsedDate?.toISOString(), '2025-03-15T12:34:56.000Z');
});

it('formatDateTimePartsLocal converts SQL UTC timestamp to browser timezone', () => {
  const OriginalDateTimeFormat = Intl.DateTimeFormat;

  Intl.DateTimeFormat = function DateTimeFormatWithFixedTimeZone(locale, options = {}) {
    const formatter = new OriginalDateTimeFormat(locale, options);
    const originalResolvedOptions = formatter.resolvedOptions.bind(formatter);

    formatter.resolvedOptions = () => ({
      ...originalResolvedOptions(),
      timeZone: 'America/Argentina/Buenos_Aires',
    });

    return formatter;
  } as any;

  try {
    const parts = formatDateTimePartsLocal('2025-03-15 12:34:56', 'en-GB');

    assert.deepEqual(parts, {
      date: '15/03/2025',
      time: '09:34:56',
    });
  } finally {
    Intl.DateTimeFormat = OriginalDateTimeFormat;
  }
});
});
