import ItemsPage from '@/modules/items/components/ItemsPage';
import { useItemsData } from '@/modules/items/hooks/useItemsData';

export default function Items() {
  useItemsData();
  return <ItemsPage />;
}
