'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import ChangePasswordModal from './ChangePasswordModal';
import EmailSetupModal from './EmailSetupModal';

/**
 * OnboardingGuard wraps the app content and shows blocking modals for:
 * 1. First-login password change (must_change_password = true)
 * 2. Email setup (email_setup_complete = false, after password is set)
 *
 * These modals cannot be dismissed — the user must complete them to proceed.
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState<'loading' | 'change-password' | 'email-setup' | 'done'>('loading');

  // Debug: log every render
  console.log('[GUARD] render — status:', status, '| step:', step, '| session user:', session?.user ? JSON.stringify({
    id: (session.user as any).id,
    mustChangePassword: (session.user as any).mustChangePassword,
    emailSetupComplete: (session.user as any).emailSetupComplete,
    role: (session.user as any).role,
  }) : 'null', '| pathname:', pathname);

  useEffect(() => {
    console.log('[GUARD] useEffect fired — status:', status, '| session?.user:', !!session?.user);
    if (status === 'loading') {
      console.log('[GUARD]   → setStep(loading)');
      setStep('loading');
      return;
    }
    if (!session?.user) {
      console.log('[GUARD]   → setStep(done) — no user');
      setStep('done'); // Not logged in — no modals, page will redirect via middleware
      return;
    }

    const user = session.user as {
      mustChangePassword: boolean;
      emailSetupComplete: boolean;
      role: string;
    };

    console.log('[GUARD]   → user flags: mustChangePassword=', user.mustChangePassword, ', emailSetupComplete=', user.emailSetupComplete);

    if (user.mustChangePassword) {
      console.log('[GUARD]   → setStep(change-password)');
      setStep('change-password');
    } else if (!user.emailSetupComplete) {
      console.log('[GUARD]   → setStep(email-setup)');
      setStep('email-setup');
    } else {
      console.log('[GUARD]   → setStep(done)');
      setStep('done');
    }
  }, [session, status]);

  const handlePasswordChanged = async () => {
    console.log('[GUARD] handlePasswordChanged called, invoking update({})...');
    const refreshedSession = await update({});
    console.log('[GUARD] handlePasswordChanged — update() returned:', JSON.stringify(refreshedSession, null, 2));
    const updatedUser = refreshedSession?.user as
      | { mustChangePassword?: boolean; emailSetupComplete?: boolean }
      | undefined;

    console.log('[GUARD] handlePasswordChanged — updatedUser:', JSON.stringify(updatedUser));

    if (updatedUser?.mustChangePassword) {
      console.log('[GUARD] handlePasswordChanged — still mustChangePassword! staying on change-password');
      setStep('change-password');
      return;
    }

    if (updatedUser && !updatedUser.emailSetupComplete) {
      console.log('[GUARD] handlePasswordChanged — moving to email-setup');
      setStep('email-setup');
      return;
    }

    console.log('[GUARD] handlePasswordChanged — all done, setting step=done');
    setStep('done');
    router.refresh();
  };

  const handleEmailSetupComplete = async () => {
    console.log('[GUARD] handleEmailSetupComplete called, invoking update({})...');
    await update({});
    setStep('done');
    router.refresh();
  };

  // Don't show modals on the login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (step === 'change-password' && session?.user) {
    const user = session.user as { username: string };
    return (
      <>
        {children}
        <ChangePasswordModal
          username={user.username}
          onComplete={handlePasswordChanged}
        />
      </>
    );
  }

  if (step === 'email-setup' && session?.user) {
    const user = session.user as { role: string; userEmail: string | null };
    return (
      <>
        {children}
        <EmailSetupModal
          role={user.role}
          currentEmail={user.userEmail}
          onComplete={handleEmailSetupComplete}
        />
      </>
    );
  }

  return <>{children}</>;
}
