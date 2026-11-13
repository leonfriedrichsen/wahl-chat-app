'use client';

import { Button } from '@/components/ui/button';
import { confirmBriefingSubscription } from '@/lib/briefing/subscription-actions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { briefingErrorMessage } from './briefing-client';

/**
 * The page the confirm mail links to. Confirming takes a click rather than
 * happening on load: mail scanners open links on their own, and a confirmed
 * address must mean the reader asked for it.
 */
function ConfirmBriefing({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await confirmBriefingSubscription(token);
      if (result.ok) {
        router.push('/einstellungen/briefing?bestaetigt=1');
        return;
      }
      setError(briefingErrorMessage(result));
    } catch (failure) {
      console.error('Could not confirm the briefing', failure);
      setError('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-4 pt-8">
      <h1 className="text-2xl font-bold">Briefing bestätigen</h1>
      {error ? (
        <>
          <p className="text-muted-foreground">
            {error} In den Einstellungen kannst du dir eine neue E-Mail schicken
            lassen.
          </p>
          <Button asChild className="self-start">
            <Link href="/einstellungen/briefing">Zu den Einstellungen</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="text-muted-foreground">
            Bestätige, dass du nach Sitzungswochen eine E-Mail von wahl.chat
            bekommen möchtest.
          </p>
          <Button
            type="button"
            className="self-start"
            disabled={busy || !token}
            onClick={confirm}
          >
            Anmeldung bestätigen
          </Button>
        </>
      )}
    </div>
  );
}

export default ConfirmBriefing;
