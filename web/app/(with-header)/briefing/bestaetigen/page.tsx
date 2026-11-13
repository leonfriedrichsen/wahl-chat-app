import ConfirmBriefing from '@/components/briefing/confirm-briefing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Briefing bestätigen',
  robots: 'noindex',
};

async function ConfirmBriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return <ConfirmBriefing token={typeof token === 'string' ? token : ''} />;
}

export default ConfirmBriefingPage;
