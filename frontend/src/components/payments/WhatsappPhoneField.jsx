import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const normalizeWhatsappNumber = (rawValue) => {
  if (!rawValue) return '';
  return rawValue.replace(/[^\d]/g, '');
};

export default function WhatsappPhoneField({
  id = 'whatsapp-phone',
  value,
  onChange,
  disabled = false,
  helpText = 'Solo números. Ejemplo: 5491122334455.',
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Número (con código de país)</Label>
      <Input
        id={id}
        inputMode="tel"
        placeholder="5491122334455"
        value={value}
        onChange={onChange}
        required
        disabled={disabled}
      />
      <p className="text-xs text-slate-500">{helpText}</p>
    </div>
  );
}
