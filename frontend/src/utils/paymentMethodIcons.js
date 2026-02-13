import {
  Banknote,
  CreditCard,
  QrCode,
  Smartphone,
  ArrowLeftRight,
  Wallet,
} from 'lucide-react';

const paymentMethodIconMap = {
  Banknote,
  CreditCard,
  QrCode,
  Smartphone,
  ArrowLeftRight,
  Wallet,
};

export const getPaymentMethodIcon = (iconName) => {
  if (!iconName) {
    return Wallet;
  }

  return paymentMethodIconMap[iconName] || Wallet;
};
