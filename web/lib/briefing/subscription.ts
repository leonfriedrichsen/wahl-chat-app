import { DAILY_TOPIC_KEYS } from '@/lib/daily/topics';
import type { DigestParliamentId } from '@/lib/firebase/firebase.types';

/**
 * The briefing subscription: who gets the email after a sitting week, for
 * which parliaments. Shared by the client (which only reads its own doc) and
 * the server (the only writer).
 *
 * Topic interests are deliberately NOT part of it. They live on the user's
 * own doc, so the address list a sending job reads never reveals what anyone
 * is interested in (GDPR Art. 9), and the email provider never sees them.
 */
export type BriefingStatus = 'pending' | 'active' | 'paused' | 'unsubscribed';

export type BriefingSubscription = {
  status: BriefingStatus;
  email: string | null;
  parliaments: DigestParliamentId[];
  requested_at: Date | null;
  confirmed_at: Date | null;
};

/** The parliaments a briefing can follow: those the feed covers. A Landtag
 * joins when the feed takes it in (`in_feed` in the ingestion's
 * `feed/parliaments.py`); until then none is listed, not even as "coming",
 * because all sixteen are coming and the onboarding says so in one line. */
export const BRIEFING_PARLIAMENTS: {
  id: DigestParliamentId;
  label: string;
}[] = [{ id: 'bundestag', label: 'Bundestag' }];

/** With a single parliament there is nothing to choose, so the onboarding
 * skips the step and the settings only name it. */
export const CHOOSE_PARLIAMENTS = BRIEFING_PARLIAMENTS.length > 1;

export const DEFAULT_BRIEFING_PARLIAMENTS = BRIEFING_PARLIAMENTS.map(
  (p) => p.id,
);

export const LANDTAGE_NOTE = 'Die Landtage folgen.';

/** `other` is the feed's bucket for items no topic fits; nobody subscribes
 * to it. */
export const BRIEFING_TOPIC_KEYS = DAILY_TOPIC_KEYS.filter(
  (key) => key !== 'other',
);

/** Bumped whenever the consent wording changes, so each stored consent says
 * which text the person agreed to. */
export const TOPICS_CONSENT_VERSION = '2026-11-13';
export const EMAIL_CONSENT_VERSION = '2026-11-13';

export const CONFIRM_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;
/** A resend sooner than this is refused, so the confirm button cannot be
 * used to flood someone's inbox. */
export const RESEND_MIN_GAP_MS = 60 * 1000;

function parseSelection<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  if (!value.every((v) => typeof v === 'string' && allowed.includes(v as T))) {
    return null;
  }
  return [...new Set(value as T[])];
}

/** The parliaments a subscription may carry: listed, at least one.
 * Anything else is refused as a whole rather than silently trimmed. */
export function parseBriefingParliaments(
  value: unknown,
): DigestParliamentId[] | null {
  return parseSelection(value, DEFAULT_BRIEFING_PARLIAMENTS);
}

export function parseBriefingTopics(value: unknown): string[] | null {
  return parseSelection(value, BRIEFING_TOPIC_KEYS);
}

/** Whether the person has an email briefing running or on its way. */
export function isBriefingSubscribed(
  subscription: Pick<BriefingSubscription, 'status'> | null | undefined,
): boolean {
  return (
    subscription?.status === 'active' ||
    subscription?.status === 'pending' ||
    subscription?.status === 'paused'
  );
}
