'use client';

import { useAnonymousAuth } from '@/components/anonymous-auth';
import LoginButton from '@/components/auth/login-button';
import {
  ResponsiveDialog,
  ResponsiveDialogScrollContent,
} from '@/components/chat/responsive-drawer-dialog';
import { Button } from '@/components/ui/button';
import {
  type BriefingSubscription,
  CHOOSE_PARLIAMENTS,
  LANDTAGE_NOTE,
  isBriefingSubscribed,
} from '@/lib/briefing/subscription';
import {
  setBriefingPaused,
  startBriefingSubscription,
  unsubscribeBriefing,
  updateBriefingParliaments,
} from '@/lib/briefing/subscription-actions';
import {
  deleteBriefingTopics,
  saveBriefingTopics,
} from '@/lib/firebase/firebase';
import type { DigestParliamentId } from '@/lib/firebase/firebase.types';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { toastBriefingError, withIdToken } from './briefing-client';
import BriefingOnboarding from './briefing-onboarding';
import {
  ParliamentPicker,
  TopicPicker,
  TopicsConsent,
} from './briefing-pickers';
import { useBriefingSubscription } from './use-briefing-subscription';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

const STATUS_TEXT: Record<
  Exclude<BriefingSubscription['status'], 'unsubscribed'>,
  (email: string | null) => ReactNode
> = {
  pending: (email) => (
    <>
      Bitte bestätige deine E-Mail-Adresse. Wir haben dir einen Link an{' '}
      <strong>{email}</strong> geschickt.
    </>
  ),
  active: (email) => (
    <>
      Du bekommst nach jeder Sitzungswoche eine E-Mail an{' '}
      <strong>{email}</strong>.
    </>
  ),
  paused: (email) => (
    <>
      Pausiert. Wir schicken vorerst nichts an <strong>{email}</strong>.
    </>
  ),
};

function sameSet<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

function EmailSection({
  subscription,
}: {
  subscription: BriefingSubscription;
}) {
  const { refreshUser } = useAnonymousAuth();
  const [busy, setBusy] = useState(false);

  if (subscription.status === 'unsubscribed') {
    return null;
  }

  // Status changes apply at once: they are actions, not edits to a form.
  const run = async (
    action: (idToken: string) => ReturnType<typeof unsubscribeBriefing>,
    success: string,
  ) => {
    setBusy(true);
    const result = await withIdToken(action);
    setBusy(false);
    if (result.ok) {
      toast.success(success);
    } else {
      toastBriefingError(result);
    }
  };

  return (
    <Section
      title="E-Mail"
      description={STATUS_TEXT[subscription.status](subscription.email)}
    >
      <div className="flex flex-wrap gap-2">
        {subscription.status === 'pending' && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(
                (idToken) =>
                  startBriefingSubscription(idToken, subscription.parliaments),
                'Wir haben dir die E-Mail noch einmal geschickt.',
              )
            }
          >
            E-Mail erneut senden
          </Button>
        )}
        {subscription.status === 'active' && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(
                (idToken) => setBriefingPaused(idToken, true),
                'Dein Briefing ist pausiert.',
              )
            }
          >
            Pausieren
          </Button>
        )}
        {subscription.status === 'paused' && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(
                (idToken) => setBriefingPaused(idToken, false),
                'Dein Briefing läuft wieder.',
              )
            }
          >
            Fortsetzen
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={async () => {
            await run(
              unsubscribeBriefing,
              'Du bist abgemeldet. Deine Adresse und Themen sind gelöscht.',
            );
            // The server deleted the topics; the page must not keep showing
            // them.
            await refreshUser();
          }}
        >
          Abmelden
        </Button>
      </div>
    </Section>
  );
}

/**
 * Parliaments and topics, edited together and saved with one button. The
 * pickers follow the stored values until the reader changes something; the
 * save bar only appears then. Withdrawing the topic consent stays a separate,
 * immediate action, since it deletes data rather than editing it; it sits in
 * the explanation, where it cannot be mistaken for one more topic.
 */
function PreferencesForm({
  subscription,
}: {
  subscription: BriefingSubscription;
}) {
  const { user, refreshUser } = useAnonymousAuth();
  const savedParliaments = subscription.parliaments;
  const savedTopics = user?.briefing_topics ?? [];
  const hasConsent = !!user?.briefing_topics_consent;

  // Null while unedited, so the pickers follow the stored values.
  const [parliamentsDraft, setParliamentsDraft] = useState<
    DigestParliamentId[] | null
  >(null);
  const [topicsDraft, setTopicsDraft] = useState<string[] | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const parliaments = parliamentsDraft ?? savedParliaments;
  const topics = topicsDraft ?? savedTopics;
  const parliamentsChanged = !sameSet(parliaments, savedParliaments);
  const topicsChanged = !sameSet(topics, savedTopics);
  const dirty = parliamentsChanged || topicsChanged;
  // Topics are stored only under a consent; it is asked again whenever none
  // is stored (after it was withdrawn).
  const needsConsent = topicsChanged && !hasConsent;
  const canSave =
    dirty &&
    !busy &&
    parliaments.length > 0 &&
    topics.length > 0 &&
    (!needsConsent || consent);

  const reset = () => {
    setParliamentsDraft(null);
    setTopicsDraft(null);
    setConsent(false);
  };

  const save = async () => {
    if (!user) {
      return;
    }
    setBusy(true);
    try {
      if (parliamentsChanged) {
        const result = await withIdToken((idToken) =>
          updateBriefingParliaments(idToken, parliaments),
        );
        if (!result.ok) {
          toastBriefingError(result);
          return;
        }
      }
      if (topicsChanged) {
        await saveBriefingTopics(user.uid, topics);
        await refreshUser();
      }
      reset();
      toast.success('Deine Änderungen sind gespeichert.');
    } catch (error) {
      console.error('Could not save briefing settings', error);
      toast.error('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!user) {
      return;
    }
    setBusy(true);
    try {
      await deleteBriefingTopics(user.uid);
      await refreshUser();
      reset();
      toast.success('Deine Themen sind gelöscht.');
    } catch (error) {
      console.error('Could not delete briefing topics', error);
      toast.error('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Section
        title="Parlamente"
        description={
          CHOOSE_PARLIAMENTS
            ? 'Nach den Sitzungswochen dieser Parlamente bekommst du eine E-Mail.'
            : `Bundestag. ${LANDTAGE_NOTE}`
        }
      >
        {CHOOSE_PARLIAMENTS && (
          <ParliamentPicker
            value={parliaments}
            onChange={setParliamentsDraft}
            disabled={busy}
          />
        )}
      </Section>

      <Section
        title="Themen"
        description={
          <>
            Dein Briefing zeigt Debatten und Abstimmungen zu diesen Themen. Sie
            bleiben bei wahl.chat und stehen nie in einer E-Mail.
            {hasConsent && (
              <>
                {' '}
                Du kannst deine Themen jederzeit{' '}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                  disabled={busy}
                  onClick={withdraw}
                >
                  löschen
                </button>
                , damit nimmst du auch deine Einwilligung zurück. Beim Abmelden
                werden sie ebenfalls gelöscht.
              </>
            )}
          </>
        }
      >
        <TopicPicker value={topics} onChange={setTopicsDraft} disabled={busy} />
        {needsConsent && (
          <TopicsConsent
            checked={consent}
            onChange={setConsent}
            disabled={busy}
          />
        )}
      </Section>

      {dirty && (
        <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t border-border bg-background px-4 py-3 md:mx-0 md:px-0">
          <span className="mr-auto text-sm text-muted-foreground">
            Ungespeicherte Änderungen
          </span>
          <Button type="button" variant="ghost" disabled={busy} onClick={reset}>
            Verwerfen
          </Button>
          <Button type="button" disabled={!canSave} onClick={save}>
            Speichern
          </Button>
        </div>
      )}
    </>
  );
}

/**
 * Before the briefing is set up there is nothing to manage: the page offers
 * the onboarding, which asks for parliaments, topics and consent in order.
 * Topics a reader stored before unsubscribing stay deletable here.
 */
function NotSetUp({ onStart }: { onStart: () => void }) {
  const { user, refreshUser } = useAnonymousAuth();
  const [busy, setBusy] = useState(false);

  const deleteLeftoverTopics = async () => {
    if (!user) {
      return;
    }
    setBusy(true);
    try {
      await deleteBriefingTopics(user.uid);
      await refreshUser();
      toast.success('Deine Themen sind gelöscht.');
    } catch (error) {
      console.error('Could not delete briefing topics', error);
      toast.error('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-5">
      <p className="text-[15px] leading-snug">
        Du hast noch kein Briefing eingerichtet. Wähle Parlamente und Themen,
        dann bekommst du nach jeder Sitzungswoche eine kurze E-Mail.
      </p>
      <Button type="button" className="self-start" onClick={onStart}>
        Briefing einrichten
      </Button>
      {user?.briefing_topics_consent && (
        <p className="text-xs text-muted-foreground">
          Von einer früheren Einrichtung sind noch Themen gespeichert.{' '}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-xs"
            disabled={busy}
            onClick={deleteLeftoverTopics}
          >
            Themen löschen
          </Button>
        </p>
      )}
    </div>
  );
}

/** Everything a reader can change about their briefing, in one place. */
function BriefingSettings() {
  const { user, loading } = useAnonymousAuth();
  const signedIn = !!user && !user.isAnonymous;
  const { subscription, loaded } = useBriefingSubscription(
    signedIn ? user.uid : undefined,
  );
  const [onboarding, setOnboarding] = useState(false);

  if (loading && !user) {
    return null;
  }

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-4 pt-8">
        <h1 className="text-2xl font-bold">Briefing</h1>
        <p className="text-muted-foreground">
          Melde dich an, um dein Briefing einzurichten oder zu ändern.
        </p>
        <LoginButton
          purpose="briefings"
          noUserChildren={<Button className="self-start">Anmelden</Button>}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pt-8">
      <h1 className="text-2xl font-bold">Briefing</h1>
      {loaded &&
        (subscription && isBriefingSubscribed(subscription) ? (
          <>
            <EmailSection subscription={subscription} />
            <PreferencesForm subscription={subscription} />
          </>
        ) : (
          <NotSetUp onStart={() => setOnboarding(true)} />
        ))}

      <ResponsiveDialog open={onboarding} onOpenChange={setOnboarding}>
        <ResponsiveDialogScrollContent>
          <BriefingOnboarding onDone={() => setOnboarding(false)} />
        </ResponsiveDialogScrollContent>
      </ResponsiveDialog>
    </div>
  );
}

export default BriefingSettings;
