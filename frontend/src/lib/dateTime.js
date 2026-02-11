const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

export const formatDateTimeAR = (value, options = {}) => {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '-';
  }

  return new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    ...options,
  }).format(date);
};

export const formatTicketDatePartsAR = (value) => {
  if (!value) {
    return { date: '-', time: '-' };
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: '-', time: '-' };
  }

  const dateLabel = new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

  const timeLabel = new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
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
