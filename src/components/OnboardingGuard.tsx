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

  useEffect(() => {
    if (status === 'loading') {
      setStep('loading');
      return;
    }
    if (!session?.user) {
      setStep('done'); // Not logged in — no modals, page will redirect via middleware
      return;
    }

    const user = session.user as {
      mustChangePassword: boolean;
      emailSetupComplete: boolean;
      role: string;
    };

    if (user.mustChangePassword) {
      setStep('change-password');
    } else if (!user.emailSetupComplete) {
      setStep('email-setup');
    } else {
      setStep('done');
    }
  }, [session, status]);

  const handlePasswordChanged = async () => {
    const refreshedSession = await update({});
    const updatedUser = refreshedSession?.user as
      | { mustChangePassword?: boolean; emailSetupComplete?: boolean }
      | undefined;

    if (updatedUser?.mustChangePassword) {
      setStep('change-password');
      return;
    }

    if (updatedUser && !updatedUser.emailSetupComplete) {
      setStep('email-setup');
      return;
    }

    setStep('done');
    router.refresh();
  };

  const handleEmailSetupComplete = async () => {
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
