'use client';

import Logo from '@/components/chat/logo';
import {
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from '@/components/chat/responsive-drawer-dialog';
import GithubIcon from '@/components/icons/github-icon';
import GoogleIcon from '@/components/icons/google-icon';
import { Button } from '@/components/ui/button';
import { MailIcon } from 'lucide-react';
import Link from 'next/link';

/**
 * What a briefing looks like: one sitting week, the matters on the reader's
 * topics, each with its result. The example is real (Bundestag, October
 * 2026) but trimmed, and marked as an example. It shows the briefing itself
 * rather than the email: the email only says that a briefing is ready, and
 * names no topic.
 */
function SampleBriefing() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-lg border border-border bg-background text-left"
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted px-3 py-2">
        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-zinc-900">
          <Logo variant="small" className="size-3.5 text-white" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[11px] font-bold">
            Bundestag · Sitzungswoche 42
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            3 Beschlüsse zu deinen Themen
          </div>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground">
          Beispiel
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-border text-xs leading-snug">
        <li className="px-3.5 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Klimaschutz und Umwelt
          </div>
          <div className="font-semibold">
            CO₂-Preis bleibt 2027 auf dem Niveau von 2026
          </div>
          <div className="text-muted-foreground">
            Angenommen · 303 dafür, 210 dagegen
          </div>
        </li>
        <li className="px-3.5 py-2.5 [mask-image:linear-gradient(180deg,#000_40%,transparent)]">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Außenpolitik und Europa
          </div>
          <div className="font-semibold">
            Bundeswehr bleibt bis Oktober 2027 im Roten Meer
          </div>
          <div className="text-muted-foreground">
            Angenommen · 421 dafür, 66 dagegen
          </div>
        </li>
      </ul>
    </div>
  );
}

/**
 * The briefing sign-up: a sample briefing, the pitch, and the ways to sign
 * up, Google first. Holds no sign-in logic; the login form passes
 * its own handlers in.
 */
function WeeklySignup({
  onGoogle,
  onGithub,
  onEmail,
  onLogin,
  disabled,
}: {
  onGoogle: () => void;
  onGithub: () => void;
  onEmail: () => void;
  onLogin: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-0">
      <SampleBriefing />
      <div className="flex flex-col gap-2">
        <ResponsiveDialogTitle className="text-left text-2xl font-extrabold leading-tight tracking-tight">
          Dein Briefing zum Bundestag
        </ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="text-left text-[15px] text-muted-foreground">
          Nach jeder Sitzungswoche: was zu deinen Themen beschlossen und
          debattiert wurde, mit Quellen. Per E-Mail bekommst du einen kurzen
          Hinweis, wenn dein Briefing bereitliegt.
        </ResponsiveDialogDescription>
      </div>
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          className="h-11 w-full gap-2.5 text-[15px] font-semibold"
          onClick={onGoogle}
          disabled={disabled}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-white">
            <GoogleIcon className="!size-3.5" />
          </span>
          Mit Google
        </Button>
        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:border-t after:border-border">
          <span className="relative z-10 bg-background px-2 text-muted-foreground">
            oder
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2"
            onClick={onEmail}
            disabled={disabled}
          >
            <MailIcon className="size-4" aria-hidden />
            Mit E-Mail
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2"
            onClick={onGithub}
            disabled={disabled}
          >
            <GithubIcon className="!size-4" />
            Mit GitHub
          </Button>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Mit der Anmeldung akzeptierst du unsere{' '}
        <Link href="/datenschutz" target="_blank" className="underline">
          Datenschutzerklärung
        </Link>
        .
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Schon dabei?{' '}
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 font-semibold text-foreground underline-offset-4"
          onClick={onLogin}
          disabled={disabled}
        >
          Anmelden
        </Button>
      </p>
    </div>
  );
}

export default WeeklySignup;
