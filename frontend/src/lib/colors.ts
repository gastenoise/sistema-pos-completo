export const RECOMMENDED_HEX_COLORS = [
  '#3B82F6', // azul
  '#10B981', // verde
  '#F59E0B', // ámbar
  '#EF4444', // rojo
  '#8B5CF6', // violeta
  '#EC4899', // fucsia
  '#06B6D4', // cian
  '#84CC16', // lima
];

export const DEFAULT_COLOR_HEX = '#3B82F6';

export const normalizeHexColor = (value, fallback = DEFAULT_COLOR_HEX) => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toUpperCase();
  return /^#[A-F0-9]{6}$/.test(normalized) ? normalized : fallback;
};
