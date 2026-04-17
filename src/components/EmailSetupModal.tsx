'use client';

import { useState } from 'react';
import { Mail, Key, Eye, EyeOff, ExternalLink, ChevronDown, ChevronUp, X } from 'lucide-react';

interface EmailSetupModalProps {
  role: string;
  currentEmail: string | null;
  onComplete: () => void;
  canSkip?: boolean;
  onSkip?: () => void;
  mode?: 'onboarding' | 'settings';
}

/**
 * Validates an email address format.
 * Checks structure, domain has at least one dot, and TLD is 2+ chars.
 */
function isValidEmail(email: string): boolean {
  // Standard email regex: local@domain.tld
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Returns a user-friendly email validation error, or null if valid.
 */
function getEmailError(email: string): string | null {
  const trimmed = email.trim();

  if (!trimmed) return 'Email address is required';
  if (!trimmed.includes('@')) return 'Email must contain an @ symbol';

  const [localPart, domain] = trimmed.split('@');

  if (!localPart || localPart.length === 0) return 'Email is missing the part before @';
  if (!domain || domain.length === 0) return 'Email is missing the domain after @';
  if (!domain.includes('.')) return 'Email domain must contain a dot (e.g., example.com)';

  const tld = domain.split('.').pop() || '';
  if (tld.length < 2) return 'Email domain has an invalid TLD';

  if (!isValidEmail(trimmed)) return 'Please enter a valid email address';

  return null;
}

export default function EmailSetupModal({
  role,
  currentEmail,
  onComplete,
  canSkip = false,
  onSkip,
  mode = 'onboarding',
}: EmailSetupModalProps) {
  const [email, setEmail] = useState(currentEmail || '');
  const [gmailAppPassword, setGmailAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const requiresSmtp = role === 'submitter' || role === 'verifier' || role === 'admin';
  const emailError = emailTouched ? getEmailError(email) : null;
  const isSettingsMode = mode === 'settings';

  const handleSkip = () => {
    onSkip?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = getEmailError(email);
    if (validationError) {
      setError(validationError);
      setEmailTouched(true);
      return;
    }

    if (requiresSmtp && !gmailAppPassword) {
      setError('Google App Password is required for this role');
      return;
    }

    if (requiresSmtp && gmailAppPassword.replace(/\s/g, '').length !== 16) {
      setError('Google App Password should be 16 characters (without spaces)');
      return;
    }

    setLoading(true);
    try {
      const cleanAppPassword = gmailAppPassword.replace(/\s/g, '');

      // For roles that send emails: validate Gmail SMTP credentials before saving
      if (requiresSmtp && cleanAppPassword) {
        const verifyRes = await fetch('/api/verify-smtp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), appPassword: cleanAppPassword }),
        });

        if (!verifyRes.ok) {
          const verifyData = await verifyRes.json();
          setError(verifyData.error || 'Gmail credentials verification failed');
          return;
        }
      }

      // Credentials verified — save to profile
      const body: Record<string, unknown> = {
        email: email.trim(),
        emailSetupComplete: true,
      };

      if (requiresSmtp && cleanAppPassword) {
        body.gmailAppPassword = cleanAppPassword;
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save email settings');
        return;
      }

      onComplete();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {isSettingsMode ? 'Email Settings' : 'Set Up Email Notifications'}
                </h2>
                <p className="text-emerald-100 text-sm">
                  {isSettingsMode
                    ? 'Add or update your email credentials for notifications'
                    : requiresSmtp
                      ? 'Required to send notification emails from your account'
                      : 'Required to receive notifications'}
                </p>
              </div>
            </div>
            {(canSkip || isSettingsMode) && (
              <button
                type="button"
                onClick={handleSkip}
                className="p-1 rounded-md hover:bg-white/15 transition-colors"
                aria-label={isSettingsMode ? 'Close email settings' : 'Skip email setup'}
                title={isSettingsMode ? 'Close' : 'Skip for now'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailTouched) setEmailTouched(true);
              }}
              onBlur={() => setEmailTouched(true)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                emailError ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="your.email@example.com"
              required
              autoFocus
            />
            {emailError && (
              <p className="text-xs text-red-600 mt-1">{emailError}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {requiresSmtp
                ? 'This Google account email will be used to send notification emails'
                : 'Notification emails will be sent to this address'}
            </p>
          </div>

          {/* Gmail App Password (required for sender roles) */}
          {requiresSmtp && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    Google App Password <span className="text-red-500">*</span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={gmailAppPassword}
                    onChange={(e) => setGmailAppPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-10 font-mono tracking-wider"
                    placeholder="xxxx xxxx xxxx xxxx"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  16-character password from Google (not your regular Google password)
                </p>
              </div>

              {/* Security note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <p className="text-xs text-blue-800">
                  <strong>🔒 Security:</strong> Your App Password is encrypted with AES-256-GCM before
                  storage. It cannot be viewed by anyone — not even the admin or database administrators.
                </p>
              </div>

              {/* Instructions accordion */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span>📋 How to generate a Google App Password</span>
                  {showInstructions ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {showInstructions && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                    <div className="mt-3 space-y-2.5">
                      <div className="flex gap-2.5">
                        <span className="shrink-0 w-6 h-6 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center justify-center">1</span>
                        <div className="text-sm text-gray-600">
                          <strong>Enable 2-Step Verification</strong> on your Google account.
                          Go to{' '}
                          <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                            Google Account Security <ExternalLink className="w-3 h-3" />
                          </a>{' '}
                          → Turn on 2-Step Verification if not already enabled.
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <span className="shrink-0 w-6 h-6 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center justify-center">2</span>
                        <div className="text-sm text-gray-600">
                          <strong>Generate an App Password.</strong> Go to{' '}
                          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                            App Passwords page <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <span className="shrink-0 w-6 h-6 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center justify-center">3</span>
                        <div className="text-sm text-gray-600">
                          <strong>Enter an app name</strong> (e.g., &quot;Hours Tracker&quot;) and click <strong>Create</strong>.
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <span className="shrink-0 w-6 h-6 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center justify-center">4</span>
                        <div className="text-sm text-gray-600">
                          <strong>Copy the 16-character password</strong> shown (like <code className="bg-gray-100 px-1 rounded">abcd efgh ijkl mnop</code>) and paste it above.
                          Spaces are automatically removed.
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                      <p className="text-xs text-yellow-800">
                        <strong>Note:</strong> This is NOT your regular Google password. It&apos;s a special 16-character
                        code generated by Google specifically for third-party apps.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* For viewer-only recipients */}
          {!requiresSmtp && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-600">
                You&apos;ll receive email notifications when hours are submitted or verified.
                Please enter the email address where you&apos;d like to receive these notifications.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          )}

          {canSkip && !isSettingsMode && (
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Skip for now
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verifying & Saving...' : isSettingsMode ? 'Save Email Settings' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
