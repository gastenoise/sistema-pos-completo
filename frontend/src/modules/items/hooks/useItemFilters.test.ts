/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useItemFilters, DEFAULT_ITEM_FILTERS } from './useItemFilters';

describe('useItemFilters', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes with default filters', () => {
    const { result } = renderHook(() => useItemFilters());
    expect(result.current.searchQuery).toBe(DEFAULT_ITEM_FILTERS.search);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('loads initial state from localStorage if storageKey is provided', () => {
    const storageKey = 'items:filters:test';
    const savedState = { search: 'pre-saved', category: '1' };
    localStorage.setItem(storageKey, JSON.stringify(savedState));

    const { result } = renderHook(() => useItemFilters({ storageKey }));

    expect(result.current.searchQuery).toBe('pre-saved');
    expect(result.current.categoryFilter).toBe('1');
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('persists changes to localStorage', () => {
    const storageKey = 'items:filters:persist';
    const { result } = renderHook(() => useItemFilters({ storageKey }));

    act(() => {
      result.current.setSearchQuery('new search');
    });

    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    expect(saved.search).toBe('new search');
  });

  it('resets filters correctly', () => {
    const storageKey = 'items:filters:reset';
    const { result } = renderHook(() => useItemFilters({ storageKey }));

    act(() => {
      result.current.setSearchQuery('dirty');
      result.current.setOnlyPriceUpdated(true);
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.searchQuery).toBe(DEFAULT_ITEM_FILTERS.search);
    expect(result.current.onlyPriceUpdated).toBe(DEFAULT_ITEM_FILTERS.onlyPriceUpdated);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it('isolates state by storageKey', () => {
    const key1 = 'filters:1';
    const key2 = 'filters:2';

    const { result: res1 } = renderHook(() => useItemFilters({ storageKey: key1 }));
    const { result: res2 } = renderHook(() => useItemFilters({ storageKey: key2 }));

    act(() => {
      res1.current.setSearchQuery('search 1');
    });

    expect(JSON.parse(localStorage.getItem(key1) || '{}').search).toBe('search 1');
    expect(localStorage.getItem(key2)).toBeNull();
  });
});
