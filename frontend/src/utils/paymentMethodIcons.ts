import {
  Banknote,
  CreditCard,
  QrCode,
  Smartphone,
  ArrowLeftRight,
  Wallet,
} from 'lucide-react';
import { resolveIconName } from '@/lib/iconCatalog';

const paymentMethodIconMap = {
  Banknote,
  CreditCard,
  QrCode,
  Smartphone,
  ArrowLeftRight,
  Wallet,
};

export const getPaymentMethodIcon = (iconValue) => {
  const iconName = resolveIconName(iconValue);
  if (!iconName) {
    return Wallet;
  }

  return paymentMethodIconMap[iconName] || Wallet;
};
