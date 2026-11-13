'use client';

import { useAnonymousAuth } from '@/components/anonymous-auth';
import {
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from '@/components/chat/responsive-drawer-dialog';
import { Button } from '@/components/ui/button';
import {
  CHOOSE_PARLIAMENTS,
  DEFAULT_BRIEFING_PARLIAMENTS,
  LANDTAGE_NOTE,
} from '@/lib/briefing/subscription';
import { startBriefingSubscription } from '@/lib/briefing/subscription-actions';
import { saveBriefingTopics } from '@/lib/firebase/firebase';
import type { DigestParliamentId } from '@/lib/firebase/firebase.types';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon, MailCheckIcon, MailIcon } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { toastBriefingError, withIdToken } from './briefing-client';
import {
  ParliamentPicker,
  TopicPicker,
  TopicsConsent,
} from './briefing-pickers';

type Step = 'parliaments' | 'topics' | 'email' | 'sent';

const STEPS: Step[] = CHOOSE_PARLIAMENTS
  ? ['parliaments', 'topics', 'email']
  : ['topics', 'email'];

/**
 * One onboarding step: progress, title, content, then the buttons.
 * "Zurück" sits next to "Weiter", so the way on is always where the thumb
 * already is.
 */
function StepLayout({
  step,
  title,
  description,
  children,
  primary,
  onBack,
}: {
  step: Step;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  primary: ReactNode;
  onBack?: () => void;
}) {
  const index = STEPS.indexOf(step);
  return (
    <div className="flex flex-col gap-6 p-4 md:p-0">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div aria-hidden className="flex flex-1 gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  i <= index ? 'bg-foreground' : 'bg-muted',
                )}
              />
            ))}
          </div>
          <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            <span aria-hidden>
              {index + 1}/{STEPS.length}
            </span>
            <span className="sr-only">
              Schritt {index + 1} von {STEPS.length}
            </span>
          </span>
        </div>
        <ResponsiveDialogTitle className="text-left text-2xl font-extrabold leading-tight tracking-tight">
          {title}
        </ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="text-left text-[15px] leading-snug text-muted-foreground">
          {description}
        </ResponsiveDialogDescription>
      </div>
      {children}
      <div className="flex gap-2">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            className="h-11 px-4"
            onClick={onBack}
          >
            <ChevronLeftIcon className="size-4" aria-hidden />
            Zurück
          </Button>
        )}
        <div className="flex-1">{primary}</div>
      </div>
    </div>
  );
}

/**
 * Sets up the briefing for a signed-in reader: which parliaments, which
 * topics (with their own consent), then the double opt-in for the email.
 * Renders inside a ResponsiveDialog it does not own.
 */
function BriefingOnboarding({ onDone }: { onDone: () => void }) {
  const { user, refreshUser } = useAnonymousAuth();
  const [step, setStep] = useState<Step>(STEPS[0]);
  const [parliaments, setParliaments] = useState<DigestParliamentId[]>(
    DEFAULT_BRIEFING_PARLIAMENTS,
  );
  const [topics, setTopics] = useState<string[]>(user?.briefing_topics ?? []);
  const [topicsConsent, setTopicsConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const uid = user?.uid;

  const saveTopics = async () => {
    if (!uid) {
      return;
    }
    setBusy(true);
    try {
      await saveBriefingTopics(uid, topics);
      await refreshUser();
      setStep('email');
    } catch (error) {
      console.error('Could not save briefing topics', error);
      toast.error('Deine Themen konnten nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  };

  const sendConfirmMail = async () => {
    setBusy(true);
    const result = await withIdToken((idToken) =>
      startBriefingSubscription(idToken, parliaments),
    );
    setBusy(false);
    if (!result.ok) {
      toastBriefingError(result);
      return;
    }
    if (result.status === 'pending') {
      setStep('sent');
    } else {
      toast.success('Deine Auswahl ist gespeichert.');
      onDone();
    }
  };

  const primaryClass = 'h-11 w-full text-[15px] font-semibold';

  if (step === 'parliaments') {
    return (
      <StepLayout
        step={step}
        title="Welche Parlamente?"
        description="Nach jeder Sitzungswoche bekommst du eine kurze E-Mail. Dein Briefing liegt dann auf wahl.chat bereit."
        primary={
          <Button
            type="button"
            className={primaryClass}
            disabled={parliaments.length === 0}
            onClick={() => setStep('topics')}
          >
            Weiter
          </Button>
        }
      >
        <ParliamentPicker value={parliaments} onChange={setParliaments} />
      </StepLayout>
    );
  }

  if (step === 'topics') {
    return (
      <StepLayout
        step={step}
        title="Welche Themen interessieren dich?"
        description={
          CHOOSE_PARLIAMENTS
            ? 'Dein Briefing zeigt Debatten und Abstimmungen zu diesen Themen. Du kannst sie jederzeit ändern.'
            : `Nach jeder Sitzungswoche des Bundestags zeigt dir dein Briefing die Debatten und Abstimmungen zu diesen Themen. ${LANDTAGE_NOTE}`
        }
        onBack={CHOOSE_PARLIAMENTS ? () => setStep('parliaments') : undefined}
        primary={
          <Button
            type="button"
            className={primaryClass}
            disabled={busy || topics.length === 0 || !topicsConsent}
            onClick={saveTopics}
          >
            Weiter
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <TopicPicker value={topics} onChange={setTopics} disabled={busy} />
          <TopicsConsent
            checked={topicsConsent}
            onChange={setTopicsConsent}
            disabled={busy}
          />
        </div>
      </StepLayout>
    );
  }

  if (step === 'email') {
    return (
      <StepLayout
        step={step}
        title="E-Mail bestätigen"
        description="Wir schicken dir einen Link. Erst wenn du darauf klickst, bekommst du das Briefing."
        onBack={() => setStep('topics')}
        primary={
          <Button
            type="button"
            className={primaryClass}
            disabled={busy}
            onClick={sendConfirmMail}
          >
            Link senden
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
            <MailIcon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="min-w-0 truncate text-[15px] font-semibold">
              {user?.email}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Mit dem Klick willigst du ein, dass wir dir nach Sitzungswochen der
            gewählten Parlamente eine E-Mail schicken. Sie nennt keine Themen,
            die kennt nur wahl.chat. Abmelden kannst du dich jederzeit in den
            Einstellungen.
          </p>
        </div>
      </StepLayout>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 pt-6 text-center md:p-0 md:pt-4">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted">
        <MailCheckIcon className="size-7" aria-hidden />
      </span>
      <div className="flex flex-col gap-2">
        <ResponsiveDialogTitle className="text-center text-2xl font-extrabold tracking-tight">
          Schau in dein Postfach
        </ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="text-center text-[15px] leading-snug text-muted-foreground">
          Wir haben dir einen Link an{' '}
          <span className="break-all font-semibold text-foreground">
            {user?.email}
          </span>{' '}
          geschickt. Klick darauf, um dein Briefing zu starten. Der Link ist 48
          Stunden gültig.
        </ResponsiveDialogDescription>
      </div>
      <div className="flex w-full flex-col gap-2 pt-2">
        <Button type="button" className={primaryClass} onClick={onDone}>
          Fertig
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground"
          disabled={busy}
          onClick={sendConfirmMail}
        >
          Keine E-Mail bekommen? Erneut senden
        </Button>
      </div>
    </div>
  );
}

export default BriefingOnboarding;
