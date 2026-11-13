'use client';

import type { BriefingSubscription } from '@/lib/briefing/subscription';
import { listenToBriefingSubscription } from '@/lib/firebase/firebase';
import { useEffect, useState } from 'react';

/** The signed-in reader's subscription, live. `loaded` stays false until the
 * first snapshot, so nothing is offered before we know what they have. */
export function useBriefingSubscription(uid: string | undefined) {
  const [state, setState] = useState<{
    uid: string | undefined;
    subscription: BriefingSubscription | null;
  } | null>(null);

  useEffect(() => {
    if (!uid) {
      return;
    }
    return listenToBriefingSubscription(uid, (subscription) =>
      setState({ uid, subscription }),
    );
  }, [uid]);

  const current = uid && state?.uid === uid ? state : null;
  return {
    subscription: current?.subscription ?? null,
    loaded: current !== null,
  };
}
