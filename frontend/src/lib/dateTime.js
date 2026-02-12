const DEFAULT_LOCALE = 'es-AR';
const FALLBACK_TIMEZONE = 'UTC';

export const getBrowserTimeZone = () => {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (typeof timeZone === 'string' && timeZone.trim()) {
      return timeZone;
    }
  } catch {
    return FALLBACK_TIMEZONE;
  }

  return FALLBACK_TIMEZONE;
};

const resolveLocale = (locale) => {
  if (typeof locale === 'string' && locale.trim()) {
    return locale;
  }

  return DEFAULT_LOCALE;
};

export const formatDateTimeLocal = (value, options = {}, locale = DEFAULT_LOCALE) => {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '-';
  }

  return new Intl.DateTimeFormat(resolveLocale(locale), {
    timeZone: getBrowserTimeZone(),
    ...options,
  }).format(date);
};

export const formatDateTimePartsLocal = (value, locale = DEFAULT_LOCALE) => {
  if (!value) {
    return { date: '-', time: '-' };
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: '-', time: '-' };
  }

  const dateLabel = new Intl.DateTimeFormat(resolveLocale(locale), {
    timeZone: getBrowserTimeZone(),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

  const timeLabel = new Intl.DateTimeFormat(resolveLocale(locale), {
    timeZone: getBrowserTimeZone(),
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  return {
    date: dateLabel,
    time: timeLabel,
  };
};
