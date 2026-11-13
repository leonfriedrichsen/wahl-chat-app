'use client';

import { cn } from '@/lib/utils';
import { LogInIcon } from 'lucide-react';
import { forwardRef } from 'react';
import { FOCUS_RING, MUTED_TEXT } from './card-styles';

/**
 * A plain way in for readers who only want to sign in, next to "Mein
 * Briefing", which is the briefing sign-up. Icon only on phones, where the
 * header is tight. Forwards its props, since the login dialog's trigger
 * renders through it.
 */
const SignInButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    {...props}
    className={cn(
      FOCUS_RING,
      'flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-[15px] transition-colors hover:text-[var(--daily-ink)] sm:gap-2 sm:px-3 sm:text-[17px]',
      MUTED_TEXT,
      className,
    )}
  >
    <LogInIcon className="size-4" aria-hidden />
    <span className="max-sm:sr-only">Anmelden</span>
  </button>
));
SignInButton.displayName = 'SignInButton';

export default SignInButton;
