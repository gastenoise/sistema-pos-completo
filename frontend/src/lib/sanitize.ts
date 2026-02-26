export const sanitizePhoneNumber = (value) => {
  if (!value) return '';
  return String(value).replace(/[^\d]/g, '').slice(0, 20);
};

export const sanitizeEmailAddress = (value) => {
  if (!value) return '';
  return String(value).trim().replace(/[\r\n]/g, '').slice(0, 254);
};

export const escapePlainText = (value) => {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
