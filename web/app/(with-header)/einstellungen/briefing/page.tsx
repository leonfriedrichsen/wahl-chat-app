import BriefingSettings from '@/components/briefing/briefing-settings';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Briefing-Einstellungen',
  robots: 'noindex',
};

function BriefingSettingsPage() {
  // useSearchParams needs a Suspense boundary to keep the page static.
  return (
    <Suspense>
      <BriefingSettings />
    </Suspense>
  );
}

export default BriefingSettingsPage;
