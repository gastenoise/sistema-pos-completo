import SettingsPage from '@/modules/settings/components/SettingsPage';
import { useSettingsData } from '@/modules/settings/hooks/useSettingsData';

export default function Settings() {
  useSettingsData();
  return <SettingsPage />;
}
