'use server';

import { sendMailViaBrevo } from '@/lib/email/brevo';
import { getAdminDb } from '@/lib/firebase/firebase-admin-app';
import { verifyFirebaseIdToken } from '@/lib/firebase/page-visit-admin';
import {
  type DocumentData,
  FieldValue,
  Timestamp,
} from 'firebase-admin/firestore';
import {
  type BriefingResult,
  type Caller,
  type StoredSubscription,
  type SubscriptionStore,
  confirmSubscription,
  setPaused,
  startSubscription,
  unsubscribe,
  updateParliaments,
} from './subscription-service';

const COLLECTION = 'briefing_subscriptions';

function toDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

function fromFirestore(data: DocumentData) {
  return {
    status: data.status,
    email: data.email ?? null,
    parliaments: data.parliaments ?? [],
    confirm_token_hash: data.confirm_token_hash ?? null,
    confirm_expires_at: toDate(data.confirm_expires_at),
    requested_at: toDate(data.requested_at),
    confirmed_at: toDate(data.confirmed_at),
    consent_text_version: data.consent_text_version ?? null,
  } satisfies StoredSubscription;
}

const firestoreStore: SubscriptionStore = {
  async get(uid) {
    const snapshot = await getAdminDb().collection(COLLECTION).doc(uid).get();
    const data = snapshot.data();
    return data ? fromFirestore(data) : null;
  },
  async set(uid, data) {
    await getAdminDb()
      .collection(COLLECTION)
      .doc(uid)
      .set({ ...data, updated_at: Timestamp.now() });
  },
  async delete(uid) {
    await getAdminDb().collection(COLLECTION).doc(uid).delete();
  },
  async findByTokenHash(hash) {
    const snapshot = await getAdminDb()
      .collection(COLLECTION)
      .where('confirm_token_hash', '==', hash)
      .limit(1)
      .get();
    const found = snapshot.docs[0];
    return found ? { uid: found.id, data: fromFirestore(found.data()) } : null;
  },
};

async function callerFrom(idToken: string): Promise<Caller | null> {
  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      anonymous: decoded.firebase.sign_in_provider === 'anonymous',
    };
  } catch {
    return null;
  }
}

function deps() {
  return { store: firestoreStore, now: new Date() };
}

const UNAUTHENTICATED: BriefingResult = {
  ok: false,
  error: 'unauthenticated',
};

export async function startBriefingSubscription(
  idToken: string,
  parliaments: string[],
): Promise<BriefingResult> {
  const caller = await callerFrom(idToken);
  if (!caller) {
    return UNAUTHENTICATED;
  }
  return startSubscription(
    { caller, parliaments },
    {
      ...deps(),
      sendMail: sendMailViaBrevo,
      siteUrl: process.env.SITE_URL ?? 'https://wahl.chat',
    },
  );
}

export async function confirmBriefingSubscription(
  token: string,
): Promise<BriefingResult> {
  return confirmSubscription({ token }, deps());
}

export async function updateBriefingParliaments(
  idToken: string,
  parliaments: string[],
): Promise<BriefingResult> {
  const caller = await callerFrom(idToken);
  if (!caller) {
    return UNAUTHENTICATED;
  }
  return updateParliaments({ caller, parliaments }, deps());
}

export async function setBriefingPaused(
  idToken: string,
  paused: boolean,
): Promise<BriefingResult> {
  const caller = await callerFrom(idToken);
  if (!caller) {
    return UNAUTHENTICATED;
  }
  return setPaused({ caller, paused }, deps());
}

export async function unsubscribeBriefing(
  idToken: string,
): Promise<BriefingResult> {
  const caller = await callerFrom(idToken);
  if (!caller) {
    return UNAUTHENTICATED;
  }
  return unsubscribe({ caller }, { ...deps(), forgetTopics });
}

/** Topics live on the user's own doc; `set` with merge also works for a user
 * who never stored any. */
async function forgetTopics(uid: string): Promise<void> {
  await getAdminDb().collection('users').doc(uid).set(
    {
      briefing_topics: FieldValue.delete(),
      briefing_topics_consent: FieldValue.delete(),
    },
    { merge: true },
  );
}
