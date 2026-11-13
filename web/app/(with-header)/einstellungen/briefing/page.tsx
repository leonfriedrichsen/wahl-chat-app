import BriefingSettings from '@/components/briefing/briefing-settings';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Briefing-Einstellungen',
  robots: 'noindex',
};

function BriefingSettingsPage() {
  return <BriefingSettings />;
}

export default BriefingSettingsPage;
