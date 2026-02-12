const DEFAULT_LOCALE = 'es-AR';
const FALLBACK_TIMEZONE = 'UTC';
const SQL_TIMESTAMP_WITHOUT_TIMEZONE_REGEX = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/;
const ISO_TIMESTAMP_WITH_TIMEZONE_REGEX = /(Z|[+-]\d{2}:?\d{2})$/i;

const pad = (value) => String(value).padStart(2, '0');

const toISODateLocal = (date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

/**
 * Returns today's date in yyyy-MM-dd format using the browser's local day.
 * This is intentionally local (not UTC) to keep API filter semantics aligned with the UI.
 */
export const getTodayISODateLocal = (now = new Date()) => toISODateLocal(now);

/**
 * Returns an inclusive local-date range in yyyy-MM-dd format for the last N days.
 * Both bounds are computed in browser local time for API compatibility.
 */
export const getLastNDaysRangeLocal = (n, now = new Date()) => {
  const days = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - days);

  return {
    startDate: toISODateLocal(start),
    endDate: toISODateLocal(end),
  };
};

/**
 * Returns the current month local-date range in yyyy-MM-dd format.
 * Bounds are calculated using local month transitions (not UTC transitions).
 */
export const getCurrentMonthRangeLocal = (now = new Date()) => {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: toISODateLocal(start),
    endDate: toISODateLocal(end),
  };
};

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

const parseSqlTimestampWithoutTimezoneAsUtc = (value) => {
  const match = SQL_TIMESTAMP_WITHOUT_TIMEZONE_REGEX.exec(value);
  if (!match) return null;

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw, millisecondRaw = '0'] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);
  const millisecond = Number(millisecondRaw.padEnd(3, '0'));

  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));

  if (
    utcDate.getUTCFullYear() !== year
    || utcDate.getUTCMonth() !== month - 1
    || utcDate.getUTCDate() !== day
    || utcDate.getUTCHours() !== hour
    || utcDate.getUTCMinutes() !== minute
    || utcDate.getUTCSeconds() !== second
    || utcDate.getUTCMilliseconds() !== millisecond
  ) {
    return null;
  }

  return utcDate;
};

export const parseBackendDateToUtcDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;

    if (ISO_TIMESTAMP_WITH_TIMEZONE_REGEX.test(trimmedValue)) {
      const parsedIsoDate = new Date(trimmedValue);
      return Number.isNaN(parsedIsoDate.getTime()) ? null : parsedIsoDate;
    }

    const parsedSqlDate = parseSqlTimestampWithoutTimezoneAsUtc(trimmedValue);
    if (parsedSqlDate) {
      return parsedSqlDate;
    }

    const parsedDate = new Date(trimmedValue);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const formatDateTimeLocal = (value, options = {}, locale = DEFAULT_LOCALE) => {
  if (!value) return '-';

  const date = parseBackendDateToUtcDate(value);
  if (!date) {
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

  const date = parseBackendDateToUtcDate(value);
  if (!date) {
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
