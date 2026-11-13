'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
  BRIEFING_PARLIAMENTS,
  BRIEFING_TOPIC_KEYS,
} from '@/lib/briefing/subscription';
import { topicTitle } from '@/lib/daily/topics';
import type { DigestParliamentId } from '@/lib/firebase/firebase.types';
import { cn } from '@/lib/utils';
import { CheckIcon } from 'lucide-react';
import Link from 'next/link';
import { useId } from 'react';

const CHIP =
  'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
const CHIP_ON = 'border-foreground bg-foreground text-background';
const CHIP_OFF = 'border-border bg-background hover:bg-muted';

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export function TopicPicker({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (topics: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {BRIEFING_TOPIC_KEYS.map((topic) => {
        const active = value.includes(topic);
        return (
          <button
            key={topic}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(toggle(value, topic))}
            className={cn(CHIP, active ? CHIP_ON : CHIP_OFF)}
          >
            {active && <CheckIcon className="size-3.5" aria-hidden />}
            {topicTitle(topic)}
          </button>
        );
      })}
    </div>
  );
}

export function ParliamentPicker({
  value,
  onChange,
  disabled,
}: {
  value: DigestParliamentId[];
  onChange: (parliaments: DigestParliamentId[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {BRIEFING_PARLIAMENTS.map((parliament) => {
        const active = value.includes(parliament.id);
        return (
          <button
            key={parliament.id}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(toggle(value, parliament.id))}
            className={cn(CHIP, active ? CHIP_ON : CHIP_OFF)}
          >
            {active && <CheckIcon className="size-3.5" aria-hidden />}
            {parliament.label}
          </button>
        );
      })}
    </div>
  );
}

/** The explicit consent topic interests need: they can reveal a political
 * opinion (GDPR Art. 9), so it is never ticked for the reader. */
export function TopicsConsent({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(state) => onChange(state === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <label htmlFor={id} className="text-xs leading-relaxed">
        Ich willige ein, dass wahl.chat meine gewählten Themen speichert, um mir
        dazu passende Inhalte aus dem Parlament zu zeigen. Themen können
        Rückschlüsse auf politische Ansichten zulassen. Sie bleiben bei
        wahl.chat und gehen nicht an unseren E-Mail-Dienstleister. Ich kann die
        Einwilligung jederzeit in den Einstellungen widerrufen. Mehr in der{' '}
        <Link href="/datenschutz" target="_blank" className="underline">
          Datenschutzerklärung
        </Link>
        .
      </label>
    </div>
  );
}
