import type { OutgoingMail } from '@/lib/email/brevo';
import { confirmBriefingMail } from '@/lib/email/templates/confirm-briefing';
import type { DigestParliamentId } from '@/lib/firebase/firebase.types';
import { createConfirmToken, hashConfirmToken } from './confirm-token';
import {
  type BriefingStatus,
  CONFIRM_TOKEN_TTL_MS,
  EMAIL_CONSENT_VERSION,
  RESEND_MIN_GAP_MS,
  parseBriefingParliaments,
} from './subscription';

/** `briefing_subscriptions/{uid}` as the server stores it. */
export type StoredSubscription = {
  status: BriefingStatus;
  email: string | null;
  parliaments: DigestParliamentId[];
  confirm_token_hash: string | null;
  confirm_expires_at: Date | null;
  /** When the last confirm mail was sent; the double opt-in record, together
   * with `confirmed_at` and `consent_text_version`. */
  requested_at: Date | null;
  confirmed_at: Date | null;
  consent_text_version: string | null;
};

/** The storage the flows need, so they run against Firestore in production
 * and an in-memory map in tests. */
export type SubscriptionStore = {
  get(uid: string): Promise<StoredSubscription | null>;
  set(uid: string, data: StoredSubscription): Promise<void>;
  findByTokenHash(
    hash: string,
  ): Promise<{ uid: string; data: StoredSubscription } | null>;
};

/** Who is asking, from a verified ID token. The address always comes from
 * here, never from the request body, so nobody can subscribe someone else. */
export type Caller = {
  uid: string;
  email: string | null;
  anonymous: boolean;
};

export type BriefingError =
  | 'unauthenticated'
  | 'invalid'
  | 'too_soon'
  | 'send_failed'
  | 'not_found'
  | 'expired';

export type BriefingResult =
  | { ok: true; status: BriefingStatus }
  | { ok: false; error: BriefingError };

type Deps = {
  store: SubscriptionStore;
  now: Date;
};

function signedIn(caller: Caller): caller is Caller & { email: string } {
  return !caller.anonymous && !!caller.email;
}

/**
 * Starts the double opt-in, or re-sends the confirm mail. An active or paused
 * subscription only takes the new parliaments: its address is confirmed
 * already, and a second mail would ask for nothing.
 */
export async function startSubscription(
  input: { caller: Caller; parliaments: unknown },
  deps: Deps & {
    sendMail: (mail: OutgoingMail) => Promise<void>;
    siteUrl: string;
  },
): Promise<BriefingResult> {
  const { caller } = input;
  if (!signedIn(caller)) {
    return { ok: false, error: 'unauthenticated' };
  }
  const parliaments = parseBriefingParliaments(input.parliaments);
  if (!parliaments) {
    return { ok: false, error: 'invalid' };
  }

  const existing = await deps.store.get(caller.uid);

  if (
    existing &&
    (existing.status === 'active' || existing.status === 'paused') &&
    existing.email === caller.email
  ) {
    await deps.store.set(caller.uid, { ...existing, parliaments });
    return { ok: true, status: existing.status };
  }

  if (
    existing?.status === 'pending' &&
    existing.requested_at &&
    deps.now.getTime() - existing.requested_at.getTime() < RESEND_MIN_GAP_MS
  ) {
    return { ok: false, error: 'too_soon' };
  }

  const { token, hash } = createConfirmToken();
  const pending: StoredSubscription = {
    status: 'pending',
    email: caller.email,
    parliaments,
    confirm_token_hash: hash,
    confirm_expires_at: new Date(deps.now.getTime() + CONFIRM_TOKEN_TTL_MS),
    requested_at: deps.now,
    confirmed_at: null,
    consent_text_version: EMAIL_CONSENT_VERSION,
  };
  // Stored before sending: a mail whose token is not stored yet would carry a
  // link that does not work.
  await deps.store.set(caller.uid, pending);

  const confirmUrl = `${deps.siteUrl}/briefing/bestaetigen?token=${token}`;
  try {
    await deps.sendMail(
      confirmBriefingMail(caller.email, confirmUrl, deps.siteUrl),
    );
  } catch (error) {
    console.error('Could not send the briefing confirm mail', error);
    // No mail went out, so the resend gap must not block the next try.
    await deps.store.set(caller.uid, { ...pending, requested_at: null });
    return { ok: false, error: 'send_failed' };
  }

  return { ok: true, status: 'pending' };
}

/** The click on the link in the confirm mail. */
export async function confirmSubscription(
  input: { token: unknown },
  deps: Deps,
): Promise<BriefingResult> {
  if (typeof input.token !== 'string' || input.token.length === 0) {
    return { ok: false, error: 'not_found' };
  }
  const found = await deps.store.findByTokenHash(hashConfirmToken(input.token));
  if (!found || found.data.status !== 'pending') {
    return { ok: false, error: 'not_found' };
  }
  const expiresAt = found.data.confirm_expires_at;
  if (!expiresAt || expiresAt.getTime() < deps.now.getTime()) {
    return { ok: false, error: 'expired' };
  }

  await deps.store.set(found.uid, {
    ...found.data,
    status: 'active',
    confirmed_at: deps.now,
    confirm_token_hash: null,
    confirm_expires_at: null,
  });
  return { ok: true, status: 'active' };
}

async function changeConfirmed(
  caller: Caller,
  deps: Deps,
  change: (existing: StoredSubscription) => StoredSubscription | null,
): Promise<BriefingResult> {
  if (!signedIn(caller)) {
    return { ok: false, error: 'unauthenticated' };
  }
  const existing = await deps.store.get(caller.uid);
  if (!existing || existing.status === 'unsubscribed') {
    return { ok: false, error: 'not_found' };
  }
  const next = change(existing);
  if (!next) {
    return { ok: false, error: 'invalid' };
  }
  await deps.store.set(caller.uid, next);
  return { ok: true, status: next.status };
}

export function updateParliaments(
  input: { caller: Caller; parliaments: unknown },
  deps: Deps,
): Promise<BriefingResult> {
  const parliaments = parseBriefingParliaments(input.parliaments);
  return changeConfirmed(input.caller, deps, (existing) =>
    parliaments ? { ...existing, parliaments } : null,
  );
}

/** Pausing and resuming only apply to a confirmed address: a pending one is
 * not sent anything yet, and resuming must not skip the double opt-in. */
export function setPaused(
  input: { caller: Caller; paused: boolean },
  deps: Deps,
): Promise<BriefingResult> {
  return changeConfirmed(input.caller, deps, (existing) => {
    if (existing.status !== 'active' && existing.status !== 'paused') {
      return null;
    }
    return { ...existing, status: input.paused ? 'paused' : 'active' };
  });
}

/** Ends the subscription and forgets the address and the topics: without a
 * briefing there is no purpose left to keep either for. */
export async function unsubscribe(
  input: { caller: Caller },
  deps: Deps & { forgetTopics: (uid: string) => Promise<void> },
): Promise<BriefingResult> {
  const result = await changeConfirmed(input.caller, deps, (existing) => ({
    ...existing,
    status: 'unsubscribed',
    email: null,
    confirm_token_hash: null,
    confirm_expires_at: null,
  }));
  if (result.ok) {
    await deps.forgetTopics(input.caller.uid);
  }
  return result;
}
