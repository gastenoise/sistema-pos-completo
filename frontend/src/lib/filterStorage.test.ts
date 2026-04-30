/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadFilterState,
  saveFilterState,
  clearFilterState,
  hasNonDefaultFilters,
} from './filterStorage';

describe('filterStorage', () => {
  const key = 'test-filters';
  const defaults = { search: '', category: 'all', active: false };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('loadFilterState', () => {
    it('returns defaults when nothing is saved', () => {
      const result = loadFilterState(key, defaults);
      expect(result).toEqual(defaults);
    });

    it('returns merged state when valid JSON is saved', () => {
      localStorage.setItem(key, JSON.stringify({ search: 'hello' }));
      const result = loadFilterState(key, defaults);
      expect(result).toEqual({ ...defaults, search: 'hello' });
    });

    it('returns defaults and logs error on invalid JSON', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem(key, 'invalid-json');
      const result = loadFilterState(key, defaults);
      expect(result).toEqual(defaults);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('saveFilterState', () => {
    it('saves state to localStorage', () => {
      const state = { search: 'world', category: 'electronics' };
      saveFilterState(key, state);
      expect(localStorage.getItem(key)).toBe(JSON.stringify(state));
    });
  });

  describe('clearFilterState', () => {
    it('removes item from localStorage', () => {
      localStorage.setItem(key, 'some-value');
      clearFilterState(key);
      expect(localStorage.getItem(key)).toBeNull();
    });
  });

  describe('hasNonDefaultFilters', () => {
    it('returns false when state matches defaults', () => {
      expect(hasNonDefaultFilters(defaults, defaults)).toBe(false);
    });

    it('returns true when a value differs', () => {
      expect(hasNonDefaultFilters({ ...defaults, search: 'query' }, defaults)).toBe(true);
      expect(hasNonDefaultFilters({ ...defaults, active: true }, defaults)).toBe(true);
    });

    it('ignores whitespace in strings', () => {
      expect(hasNonDefaultFilters({ ...defaults, search: '  ' }, defaults)).toBe(false);
      expect(hasNonDefaultFilters({ ...defaults, search: 'query ' }, { ...defaults, search: 'query' })).toBe(false);
    });
  });
});
