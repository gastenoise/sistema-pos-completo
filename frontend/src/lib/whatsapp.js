export const LATAM_COUNTRY_CODES = [
  { iso: 'AR', label: 'Argentina', dialCode: '54' },
  { iso: 'UY', label: 'Uruguay', dialCode: '598' },
  { iso: 'CL', label: 'Chile', dialCode: '56' },
  { iso: 'PY', label: 'Paraguay', dialCode: '595' },
  { iso: 'BO', label: 'Bolivia', dialCode: '591' },
  { iso: 'PE', label: 'Perú', dialCode: '51' },
  { iso: 'BR', label: 'Brasil', dialCode: '55' },
  { iso: 'CO', label: 'Colombia', dialCode: '57' },
  { iso: 'EC', label: 'Ecuador', dialCode: '593' },
  { iso: 'MX', label: 'México', dialCode: '52' },
  { iso: 'VE', label: 'Venezuela', dialCode: '58' },
  { iso: 'CR', label: 'Costa Rica', dialCode: '506' },
];

export const DEFAULT_COUNTRY_DIAL_CODE = '54';

export const onlyDigits = (value = '') => value.replace(/\D/g, '');

const normalizeArgentinaMobile = (nationalNumber = '') => {
  let value = onlyDigits(nationalNumber).replace(/^0+/, '');

  value = value.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');

  if (value.startsWith('15')) {
    value = value.slice(2);
  }

  if (value && !value.startsWith('9')) {
    value = `9${value}`;
  }

  return value;
};

export const normalizeWhatsappNumber = ({ countryDialCode = DEFAULT_COUNTRY_DIAL_CODE, nationalNumber = '' }) => {
  const dialCode = onlyDigits(countryDialCode);
  if (!dialCode) return '';

  if (dialCode === DEFAULT_COUNTRY_DIAL_CODE) {
    return `${dialCode}${normalizeArgentinaMobile(nationalNumber)}`;
  }

  return `${dialCode}${onlyDigits(nationalNumber)}`;
};
