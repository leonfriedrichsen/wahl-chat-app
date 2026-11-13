import { describe, expect, it } from 'bun:test';
import type { OutgoingMail } from '@/lib/email/brevo';
import { buildBrevoRequest } from '@/lib/email/brevo';
import {
  type Caller,
  type StoredSubscription,
  type SubscriptionStore,
  confirmSubscription,
  setPaused,
  startSubscription,
  unsubscribe,
  updateParliaments,
} from './subscription-service';

function memoryStore(): SubscriptionStore & {
  docs: Map<string, StoredSubscription>;
} {
  const docs = new Map<string, StoredSubscription>();
  return {
    docs,
    get: async (uid) => docs.get(uid) ?? null,
    set: async (uid, data) => {
      docs.set(uid, data);
    },
    findByTokenHash: async (hash) => {
      for (const [uid, data] of docs) {
        if (data.confirm_token_hash === hash) {
          return { uid, data };
        }
      }
      return null;
    },
  };
}

const reader: Caller = {
  uid: 'u1',
  email: 'max@example.org',
  anonymous: false,
};
const T0 = new Date('2026-11-13T10:00:00Z');
const later = (ms: number) => new Date(T0.getTime() + ms);

function tokenFrom(mail: OutgoingMail): string {
  const match = mail.text.match(/token=([\w-]+)/);
  if (!match) {
    throw new Error('no confirm link in the mail');
  }
  return match[1];
}

async function subscribe(store = memoryStore()) {
  const sent: OutgoingMail[] = [];
  const result = await startSubscription(
    { caller: reader, parliaments: ['bundestag'] },
    {
      store,
      now: T0,
      siteUrl: 'https://wahl.chat',
      sendMail: async (mail) => {
        sent.push(mail);
      },
    },
  );
  return { store, sent, result };
}

describe('starting a subscription', () => {
  it('stores a pending subscription and mails a confirm link', async () => {
    const { store, sent, result } = await subscribe();

    expect(result).toEqual({ ok: true, status: 'pending' });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('max@example.org');
    const stored = store.docs.get('u1');
    expect(stored?.status).toBe('pending');
    // Only the hash is kept, never the token from the mail.
    expect(stored?.confirm_token_hash).not.toBe(tokenFrom(sent[0]));
  });

  it('refuses anonymous callers', async () => {
    const result = await startSubscription(
      {
        caller: { uid: 'anon', email: null, anonymous: true },
        parliaments: ['bundestag'],
      },
      {
        store: memoryStore(),
        now: T0,
        siteUrl: 'https://wahl.chat',
        sendMail: async () => {},
      },
    );
    expect(result).toEqual({ ok: false, error: 'unauthenticated' });
  });

  it('refuses a resend within the gap, allows it after', async () => {
    const { store } = await subscribe();
    const deps = (now: Date) => ({
      store,
      now,
      siteUrl: 'https://wahl.chat',
      sendMail: async () => {},
    });
    const input = { caller: reader, parliaments: ['bundestag'] };

    expect(await startSubscription(input, deps(later(10_000)))).toEqual({
      ok: false,
      error: 'too_soon',
    });
    expect(await startSubscription(input, deps(later(120_000)))).toEqual({
      ok: true,
      status: 'pending',
    });
  });

  it('lets the next try through when the mail could not be sent', async () => {
    const store = memoryStore();
    const failing = await startSubscription(
      { caller: reader, parliaments: ['bundestag'] },
      {
        store,
        now: T0,
        siteUrl: 'https://wahl.chat',
        sendMail: async () => {
          throw new Error('provider down');
        },
      },
    );
    expect(failing).toEqual({ ok: false, error: 'send_failed' });
    expect(store.docs.get('u1')?.requested_at).toBeNull();
  });

  it('only updates the parliaments of a confirmed subscription', async () => {
    const { store, sent } = await subscribe();
    await confirmSubscription(
      { token: tokenFrom(sent[0]) },
      { store, now: T0 },
    );

    const again: OutgoingMail[] = [];
    const result = await startSubscription(
      { caller: reader, parliaments: ['bundestag'] },
      {
        store,
        now: later(120_000),
        siteUrl: 'https://wahl.chat',
        sendMail: async (mail) => {
          again.push(mail);
        },
      },
    );
    expect(result).toEqual({ ok: true, status: 'active' });
    expect(again).toHaveLength(0);
  });
});

describe('confirming', () => {
  it('activates the subscription and spends the token', async () => {
    const { store, sent } = await subscribe();
    const token = tokenFrom(sent[0]);

    expect(
      await confirmSubscription({ token }, { store, now: later(1000) }),
    ).toEqual({ ok: true, status: 'active' });
    expect(store.docs.get('u1')?.confirmed_at).toEqual(later(1000));
    expect(
      await confirmSubscription({ token }, { store, now: later(2000) }),
    ).toEqual({ ok: false, error: 'not_found' });
  });

  it('refuses an expired link', async () => {
    const { store, sent } = await subscribe();
    const result = await confirmSubscription(
      { token: tokenFrom(sent[0]) },
      { store, now: later(49 * 60 * 60 * 1000) },
    );
    expect(result).toEqual({ ok: false, error: 'expired' });
  });

  it('refuses an unknown token', async () => {
    const { store } = await subscribe();
    expect(
      await confirmSubscription({ token: 'nope' }, { store, now: T0 }),
    ).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('managing a subscription', () => {
  it('pauses and resumes only a confirmed subscription', async () => {
    const { store, sent } = await subscribe();
    const deps = { store, now: T0 };

    expect(await setPaused({ caller: reader, paused: true }, deps)).toEqual({
      ok: false,
      error: 'invalid',
    });

    await confirmSubscription({ token: tokenFrom(sent[0]) }, deps);
    expect(await setPaused({ caller: reader, paused: true }, deps)).toEqual({
      ok: true,
      status: 'paused',
    });
    expect(await setPaused({ caller: reader, paused: false }, deps)).toEqual({
      ok: true,
      status: 'active',
    });
  });

  it('refuses parliaments outside the allowlist', async () => {
    const { store } = await subscribe();
    expect(
      await updateParliaments(
        { caller: reader, parliaments: ['landtag_xx'] },
        { store, now: T0 },
      ),
    ).toEqual({ ok: false, error: 'invalid' });
  });

  it('forgets the address and the topics on unsubscribe', async () => {
    const { store } = await subscribe();
    const forgotten: string[] = [];
    const forgetTopics = async (uid: string) => {
      forgotten.push(uid);
    };

    expect(
      await unsubscribe({ caller: reader }, { store, now: T0, forgetTopics }),
    ).toEqual({ ok: true, status: 'unsubscribed' });
    const stored = store.docs.get('u1');
    expect(stored?.email).toBeNull();
    expect(stored?.confirm_token_hash).toBeNull();
    expect(forgotten).toEqual(['u1']);
  });

  it('keeps the topics when there was nothing to unsubscribe', async () => {
    const forgotten: string[] = [];
    const result = await unsubscribe(
      { caller: reader },
      {
        store: memoryStore(),
        now: T0,
        forgetTopics: async (uid) => {
          forgotten.push(uid);
        },
      },
    );
    expect(result).toEqual({ ok: false, error: 'not_found' });
    expect(forgotten).toEqual([]);
  });
});

describe('the confirm mail', () => {
  it('carries no topic, and Brevo gets no lists or attributes', async () => {
    const { sent } = await subscribe();
    const request = buildBrevoRequest(sent[0], {
      email: 'briefing@wahl.chat',
      name: 'wahl.chat',
    });

    expect(Object.keys(request).sort()).toEqual([
      'htmlContent',
      'sender',
      'subject',
      'textContent',
      'to',
    ]);
    expect(request.to).toEqual([{ email: 'max@example.org' }]);
    for (const text of [request.subject, request.textContent]) {
      expect(text).not.toMatch(/Gesundheit|Klima|Migration|Bundestag/);
    }
  });
});
