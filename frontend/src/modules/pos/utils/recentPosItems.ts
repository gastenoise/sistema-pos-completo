const STORAGE_PREFIX = 'pos_recent_items_v1';
const MAX_RECENT_ITEMS = 60;
type LocalStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const getLocalStorage = (): LocalStorageLike | null => {
  const storageCandidate = (globalThis as any)?.localStorage;
  if (!storageCandidate) return null;
  if (typeof storageCandidate.getItem !== 'function' || typeof storageCandidate.setItem !== 'function') return null;
  return storageCandidate as LocalStorageLike;
};

const normalizeItemKey = (item: any): string | null => {
  if (!item) return null;
  const source = String(item.source || item.item_source || 'local');
  const id = item.id ?? item.catalog_item_id ?? item.item_id ?? item.sepa_item_id;
  if (id === null || id === undefined || id === '') return null;
  return `${source}:${String(id)}`;
};

const getStorageKey = (businessId: string | number | null | undefined, userId: string | number | null | undefined): string | null => {
  if (!businessId || !userId) return null;
  return `${STORAGE_PREFIX}:${String(businessId)}:${String(userId)}`;
};

export const loadRecentPosItemKeys = (
  businessId: string | number | null | undefined,
  userId: string | number | null | undefined
): string[] => {
  const storageKey = getStorageKey(businessId, userId);
  const storage = getLocalStorage();
  if (!storageKey || !storage) return [];

  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((key) => typeof key === 'string');
  } catch (_error) {
    return [];
  }
};

export const recordRecentPosItem = (
  businessId: string | number | null | undefined,
  userId: string | number | null | undefined,
  item: any
): void => {
  const storageKey = getStorageKey(businessId, userId);
  const itemKey = normalizeItemKey(item);
  const storage = getLocalStorage();
  if (!storageKey || !itemKey || !storage) return;

  const current = loadRecentPosItemKeys(businessId, userId);
  const updated = [itemKey, ...current.filter((key) => key !== itemKey)].slice(0, MAX_RECENT_ITEMS);
  storage.setItem(storageKey, JSON.stringify(updated));
};

export const sortItemsByRecentUsage = (items: any[], recentKeys: string[]): any[] => {
  if (!Array.isArray(items) || items.length === 0 || !Array.isArray(recentKeys) || recentKeys.length === 0) {
    return items;
  }

  const ranking = new Map(recentKeys.map((key, index) => [key, index]));

  return [...items].sort((a, b) => {
    const rankA = ranking.get(normalizeItemKey(a) || '');
    const rankB = ranking.get(normalizeItemKey(b) || '');
    const safeRankA = rankA === undefined ? Number.POSITIVE_INFINITY : rankA;
    const safeRankB = rankB === undefined ? Number.POSITIVE_INFINITY : rankB;
    return safeRankA - safeRankB;
  });
};
