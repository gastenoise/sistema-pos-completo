import PosPage from '@/modules/pos/components/PosPage';
import { usePosData } from '@/modules/pos/hooks/usePosData';

export default function POS() {
  usePosData();
  return <PosPage />;
}
