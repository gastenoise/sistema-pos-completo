import ReportsPage from '@/modules/reports/components/ReportsPage';
import { useSalesReports } from '@/modules/reports/hooks/useSalesReports';

export default function Reports() {
  useSalesReports();
  return <ReportsPage />;
}
