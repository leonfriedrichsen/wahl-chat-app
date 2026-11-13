'use client';

import { useAnonymousAuth } from '@/components/anonymous-auth';
import {
  ResponsiveDialog,
  ResponsiveDialogScrollContent,
  ResponsiveDialogTrigger,
} from '@/components/chat/responsive-drawer-dialog';
import WeeklySignupButton from '@/components/daily/weekly-signup-button';
import { isBriefingSubscribed } from '@/lib/briefing/subscription';
import { dismissBriefingOnboarding } from '@/lib/firebase/firebase';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import BriefingOnboarding from './briefing-onboarding';
import { useBriefingSubscription } from './use-briefing-subscription';

/**
 * "Briefing abonnieren" for a reader who is signed in but has no briefing yet: it
 * opens the onboarding directly, without the sign-in step. Signed-out readers
 * get the sign-up flow from the login button instead.
 *
 * Readers who joined the waitlist before the onboarding existed are told the
 * briefing is ready, but never interrupted: the button shows its dot, and a
 * toast offers the onboarding once. Dismissing the toast is remembered.
 */
function BriefingSignedInEntry() {
  const { user } = useAnonymousAuth();
  const signedIn = !!user && !user.isAnonymous;
  const { subscription, loaded } = useBriefingSubscription(
    signedIn ? user.uid : undefined,
  );
  const [isOpen, setIsOpen] = useState(false);
  const toastShown = useRef(false);

  const offer = signedIn && loaded && !isBriefingSubscribed(subscription);
  const fromWaitlist =
    user?.briefings_waitlist === true &&
    !user.briefings_onboarding_dismissed_at;
  const uid = user?.uid;

  useEffect(() => {
    if (!offer || !fromWaitlist || !uid || toastShown.current) {
      return;
    }
    toastShown.current = true;
    const remember = () =>
      dismissBriefingOnboarding(uid).catch((error) =>
        console.error('Could not record the dismissed briefing toast', error),
      );
    toast('Dein Briefing ist startklar.', {
      description: 'Wähl deine Themen, dann bist du dabei.',
      duration: 15_000,
      action: {
        label: 'Einrichten',
        onClick: () => {
          remember();
          setIsOpen(true);
        },
      },
      // Only an explicit close counts; a toast that timed out unseen comes
      // back on the next visit.
      onDismiss: remember,
    });
  }, [offer, fromWaitlist, uid]);

  // Stays mounted while open: confirming the mail flips the subscription to
  // pending, which would otherwise unmount the dialog mid-step.
  if (!offer && !isOpen) {
    return null;
  }

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
      <ResponsiveDialogTrigger asChild>
        <WeeklySignupButton highlight={fromWaitlist} />
      </ResponsiveDialogTrigger>
      <ResponsiveDialogScrollContent>
        <BriefingOnboarding onDone={() => setIsOpen(false)} />
      </ResponsiveDialogScrollContent>
    </ResponsiveDialog>
  );
}

export default BriefingSignedInEntry;
