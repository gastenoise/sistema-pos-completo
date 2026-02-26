import CashRegisterPage from '@/modules/cash-register/components/CashRegisterPage';
import { useCashRegisterData } from '@/modules/cash-register/hooks/useCashRegisterData';

export default function CashRegister() {
  useCashRegisterData();
  return <CashRegisterPage />;
}
