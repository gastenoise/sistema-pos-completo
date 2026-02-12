import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

const getNumberSeparators = (locale) => {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    group: parts.find((part) => part.type === 'group')?.value || ',',
    decimal: parts.find((part) => part.type === 'decimal')?.value || '.',
  };
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseLocalizedNumber = (rawValue, locale) => {
  if (typeof rawValue !== 'string') return 0;

  const { group, decimal } = getNumberSeparators(locale);
  const normalized = rawValue
    .replace(new RegExp(escapeRegExp(group), 'g'), '')
    .replace(decimal, '.')
    .replace(/[^\d.-]/g, '');

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatLocalizedNumber = (value, locale, decimals = 2) => {
  const amount = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(amount);
};

const countDigits = (text) => (text.match(/\d/g) || []).length;

const findCaretByDigitCount = (text, digitsCount) => {
  if (digitsCount <= 0) return 0;

  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (/\d/.test(text[i])) {
      seen += 1;
      if (seen >= digitsCount) {
        return i + 1;
      }
    }
  }

  return text.length;
};

export const CurrencyInput = forwardRef(function CurrencyInput(
  {
    value,
    onValueChange,
    locale = 'es-AR',
    decimals = 2,
    className,
    ...props
  },
  ref,
) {
  const resolvedLocale = useMemo(() => {
    if (locale && typeof locale === 'string') return locale;
    if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
    return 'es-AR';
  }, [locale]);

  const [displayValue, setDisplayValue] = useState(() =>
    formatLocalizedNumber(Number(value) || 0, resolvedLocale, decimals),
  );

  const inputRef = useRef(null);
  const nextCaretRef = useRef(null);

  useEffect(() => {
    const nextDisplay = formatLocalizedNumber(Number(value) || 0, resolvedLocale, decimals);
    if (nextDisplay !== displayValue) {
      setDisplayValue(nextDisplay);
    }
  }, [value, resolvedLocale, decimals, displayValue]);

  useEffect(() => {
    if (nextCaretRef.current == null) return;
    const target = inputRef.current;
    if (!target) return;

    target.setSelectionRange(nextCaretRef.current, nextCaretRef.current);
    nextCaretRef.current = null;
  }, [displayValue]);

  const assignRef = (node) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const handleChange = (event) => {
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    const digitsBeforeCaret = countDigits(raw.slice(0, caret));

    const numericValue = parseLocalizedNumber(raw, resolvedLocale);
    const scale = 10 ** decimals;
    const roundedValue = Math.round(numericValue * scale) / scale;
    const nextDisplay = formatLocalizedNumber(roundedValue, resolvedLocale, decimals);

    setDisplayValue(nextDisplay);
    onValueChange?.(roundedValue);

    nextCaretRef.current = findCaretByDigitCount(nextDisplay, digitsBeforeCaret);
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    const numericValue = parseLocalizedNumber(pasted, resolvedLocale);
    const scale = 10 ** decimals;
    const roundedValue = Math.round(numericValue * scale) / scale;
    const nextDisplay = formatLocalizedNumber(roundedValue, resolvedLocale, decimals);

    setDisplayValue(nextDisplay);
    onValueChange?.(roundedValue);
    nextCaretRef.current = nextDisplay.length;
  };

  return (
    <Input
      ref={assignRef}
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onPaste={handlePaste}
      className={className}
      {...props}
    />
  );
});

export { formatLocalizedNumber, parseLocalizedNumber };
