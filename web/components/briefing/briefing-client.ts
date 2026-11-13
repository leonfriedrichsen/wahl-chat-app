'use client';

import type { BriefingResult } from '@/lib/briefing/subscription-service';
import { getAuth } from 'firebase/auth';
import { toast } from 'sonner';

/** Runs a briefing server action with the reader's ID token. The server takes
 * identity and address from the token alone. */
export async function withIdToken(
  action: (idToken: string) => Promise<BriefingResult>,
): Promise<BriefingResult> {
  const idToken = await getAuth().currentUser?.getIdToken();
  if (!idToken) {
    return { ok: false, error: 'unauthenticated' };
  }
  try {
    return await action(idToken);
  } catch (error) {
    console.error('Briefing action failed', error);
    return { ok: false, error: 'send_failed' };
  }
}

const ERROR_MESSAGES: Record<
  Exclude<BriefingResult, { ok: true }>['error'],
  string
> = {
  unauthenticated: 'Bitte melde dich zuerst an.',
  invalid: 'Diese Auswahl ist nicht möglich.',
  too_soon:
    'Wir haben dir gerade erst eine E-Mail geschickt. Versuch es in einer Minute noch einmal.',
  send_failed:
    'Das hat nicht geklappt. Bitte versuche es in ein paar Minuten noch einmal.',
  not_found: 'Dieser Link ist nicht mehr gültig.',
  expired: 'Dieser Link ist abgelaufen.',
};

export function toastBriefingError(result: BriefingResult): void {
  if (!result.ok) {
    toast.error(ERROR_MESSAGES[result.error]);
  }
}

export function briefingErrorMessage(result: BriefingResult): string | null {
  return result.ok ? null : ERROR_MESSAGES[result.error];
}
