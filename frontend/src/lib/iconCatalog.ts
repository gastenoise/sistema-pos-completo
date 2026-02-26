import * as LucideIcons from 'lucide-react';

export const DEFAULT_ICON_NAME = 'Package';
export const DEFAULT_ICON_CATALOG = {
  1: 'Package',
  2: 'ShoppingBag',
  3: 'Coffee',
  4: 'Utensils',
  5: 'Shirt',
  6: 'Laptop',
  7: 'Smartphone',
  8: 'Book',
  9: 'Wrench',
  10: 'Home',
  11: 'Car',
  12: 'Heart',
  13: 'Gamepad',
  14: 'Pizza',
  15: 'Apple',
  16: 'Cake',
  17: 'Watch',
  18: 'Camera',
  19: 'Dumbbell',
  20: 'Paintbrush',
  21: 'Hammer',
  22: 'Scissors',
  23: 'Zap',
  24: 'Star',
  25: 'Gift',
  26: 'Tag',
  27: 'Banknote',
  28: 'CreditCard',
  29: 'QrCode',
  30: 'ArrowLeftRight',
};

export const normalizeIconCatalog = () => {
  const source = DEFAULT_ICON_CATALOG;

  return Object.entries(source).reduce((acc, [rawId, iconName]) => {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 1 || id > 30) return acc;
    if (typeof iconName !== 'string' || !iconName.trim()) return acc;
    acc[id] = iconName.trim();
    return acc;
  }, {});
};

export const resolveIconName = (iconValue) => {
  const normalizedCatalog = normalizeIconCatalog();

  if (typeof iconValue === 'string' && iconValue.trim()) {
    const iconName = iconValue.trim();
    const validNames = new Set(Object.values(normalizedCatalog));
    return validNames.has(iconName) ? iconName : DEFAULT_ICON_NAME;
  }

  const id = Number(iconValue);

  if (Number.isInteger(id) && normalizedCatalog[id]) {
    return normalizedCatalog[id];
  }

  return DEFAULT_ICON_NAME;
};

export const resolveIconId = (iconValue) => {
  const normalizedCatalog = normalizeIconCatalog();

  if (Number.isInteger(Number(iconValue)) && normalizedCatalog[Number(iconValue)]) {
    return Number(iconValue);
  }

  const iconName = resolveIconName(iconValue);
  const match = Object.entries(normalizedCatalog).find(([, name]) => name === iconName);

  return match ? Number(match[0]) : 1;
};

export const getIconComponent = (iconValue) => {
  const iconName = resolveIconName(iconValue);
  return LucideIcons[iconName] || LucideIcons[DEFAULT_ICON_NAME];
};

export const getIconOptions = () => {
  const normalizedCatalog = normalizeIconCatalog();
  return Object.entries(normalizedCatalog)
    .map(([id, name]) => ({ id: Number(id), name }))
    .sort((a, b) => a.id - b.id);
};
