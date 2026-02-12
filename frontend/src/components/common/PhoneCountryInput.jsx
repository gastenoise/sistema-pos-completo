import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DEFAULT_COUNTRY_DIAL_CODE,
  LATAM_COUNTRY_CODES,
  normalizeWhatsappNumber,
  onlyDigits,
} from '@/lib/whatsapp';

export default function PhoneCountryInput({
  countryDialCode = DEFAULT_COUNTRY_DIAL_CODE,
  nationalNumber = '',
  onChange,
  countryLabel = 'Código país',
  numberLabel = 'Número',
  numberPlaceholder = '1122334455',
}) {
  const normalizedNumber = normalizeWhatsappNumber({ countryDialCode, nationalNumber });

  const handleCountryChange = (nextDialCode) => {
    onChange?.({
      countryDialCode: nextDialCode,
      nationalNumber,
      normalizedNumber: normalizeWhatsappNumber({ countryDialCode: nextDialCode, nationalNumber }),
    });
  };

  const handleNationalNumberChange = (event) => {
    const nextNationalNumber = onlyDigits(event.target.value);

    onChange?.({
      countryDialCode,
      nationalNumber: nextNationalNumber,
      normalizedNumber: normalizeWhatsappNumber({ countryDialCode, nationalNumber: nextNationalNumber }),
    });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-[170px_1fr]">
      <div className="space-y-2">
        <Label>{countryLabel}</Label>
        <Select value={countryDialCode} onValueChange={handleCountryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná país" />
          </SelectTrigger>
          <SelectContent>
            {LATAM_COUNTRY_CODES.map((country) => (
              <SelectItem key={country.iso} value={country.dialCode}>
                {country.iso} (+{country.dialCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone-country-input-number">{numberLabel}</Label>
        <Input
          id="phone-country-input-number"
          inputMode="numeric"
          placeholder={numberPlaceholder}
          value={nationalNumber}
          onChange={handleNationalNumberChange}
          required
        />
      </div>

      <p className="sm:col-span-2 text-xs text-slate-500">
        Número normalizado para WhatsApp: <strong>{normalizedNumber || '-'}</strong>
      </p>
    </div>
  );
}
