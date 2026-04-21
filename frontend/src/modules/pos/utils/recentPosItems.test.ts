import { describe, expect, it } from 'vitest';
import { sortItemsByRecentUsage } from './recentPosItems';

describe('recentPosItems', () => {
  it('orders catalog items using recent usage keys', () => {
    const items = [
      { id: 1, source: 'local', name: 'A' },
      { id: 2, source: 'local', name: 'B' },
      { id: 3, source: 'sepa', name: 'C' },
    ];

    const sorted = sortItemsByRecentUsage(items, ['sepa:3', 'local:1']);

    expect(sorted.map((item) => item.name)).toEqual(['C', 'A', 'B']);
  });

  it('keeps original order when there are no recent keys', () => {
    const items = [
      { id: 10, source: 'local', name: 'X' },
      { id: 11, source: 'local', name: 'Y' },
    ];

    const sorted = sortItemsByRecentUsage(items, []);

    expect(sorted.map((item) => item.name)).toEqual(['X', 'Y']);
  });
});
