/**
 * Utility functions for persisting and comparing filter states.
 */

export const loadFilterState = <T>(key: string, defaults: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return { ...defaults, ...parsed };
  } catch (e) {
    console.error(`Error loading filter state for key ${key}:`, e);
    return defaults;
  }
};

export const saveFilterState = <T>(key: string, state: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.error(`Error saving filter state for key ${key}:`, e);
  }
};

export const clearFilterState = (key: string): void => {
  localStorage.removeItem(key);
};

/**
 * Checks if any property in the state differs from its default value.
 * Performs a shallow comparison.
 */
export const hasNonDefaultFilters = <T extends Record<string, any>>(state: T, defaults: T): boolean => {
  return Object.keys(defaults).some((key) => {
    const stateValue = state[key];
    const defaultValue = defaults[key];

    // Special handling for strings to ignore extra whitespace
    if (typeof stateValue === 'string' && typeof defaultValue === 'string') {
      return stateValue.trim() !== defaultValue.trim();
    }

    return stateValue !== defaultValue;
  });
};
