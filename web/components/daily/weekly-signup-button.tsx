'use client';

import {
  markWeeklySignupOpened,
  weeklySignupOpened,
} from '@/lib/daily/weekly-signup';
import { cn } from '@/lib/utils';
import { MailIcon } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';
import { FOCUS_RING } from './card-styles';

/**
 * "Briefing abonnieren": asks readers to set up the briefing after each sitting
 * week. A pulsing red dot marks it as new until this browser opens it once;
 * `highlight` shows the dot regardless, for readers we have news for. Forwards
 * its props, since the dialogs' triggers render through it.
 */
const WeeklySignupButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { highlight?: boolean }
>(({ className, onClick, highlight = false, ...props }, ref) => {
  const [isNew, setIsNew] = useState(false);

  // localStorage only exists after hydration.
  useEffect(() => {
    setIsNew(highlight || !weeklySignupOpened());
  }, [highlight]);

  return (
    <button
      ref={ref}
      type="button"
      {...props}
      onClick={(event) => {
        if (isNew) {
          markWeeklySignupOpened();
          setIsNew(false);
        }
        onClick?.(event);
      }}
      className={cn(
        FOCUS_RING,
        'relative flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[var(--daily-ink)] px-3 text-[14px] font-semibold text-[var(--daily-canvas)] sm:gap-2 sm:px-4 sm:text-[15px]',
        className,
      )}
    >
      <MailIcon className="size-4" aria-hidden />
      {/* Phones show "Briefing" alone; screen readers always hear the
          whole action. */}
      <span>
        Briefing<span className="max-sm:sr-only"> abonnieren</span>
      </span>
      {isNew && (
        <span className="absolute -right-1 -top-1 flex size-2.5">
          <span
            aria-hidden
            className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75 motion-reduce:animate-none"
          />
          <span className="relative inline-flex size-2.5 rounded-full bg-red-500 ring-2 ring-[var(--daily-canvas)]">
            <span className="sr-only">neu</span>
          </span>
        </span>
      )}
    </button>
  );
});
WeeklySignupButton.displayName = 'WeeklySignupButton';

export default WeeklySignupButton;
