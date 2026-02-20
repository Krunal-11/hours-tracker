'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { Clock } from 'lucide-react';

// DEBUG: toggle this to false to remove debug panel before next production deploy
const DEBUG_MODE = true;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const { data: session, status: sessionStatus } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDebugInfo(null);
    setLoading(true);

    const debugData: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      step: 'start',
      sessionStatusBefore: sessionStatus,
      sessionUserBefore: session?.user ?? null,
    };

    try {
      debugData.step = 'calling signIn';
      console.log('[DEBUG] Calling signIn with redirect:false', { username });

      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      debugData.step = 'signIn returned';
      debugData.result = {
        ok: result?.ok,
        error: result?.error,
        status: result?.status,
        url: result?.url,
      };
      console.log('[DEBUG] signIn result:', debugData.result);

      if (result?.error) {
        debugData.step = 'error branch';
        console.log('[DEBUG] Error branch — result.error:', result.error);
        setError('Invalid username or password');
        setDebugInfo(DEBUG_MODE ? debugData : null);
      } else if (!result?.ok) {
        // ok is false but no error string — unexpected failure
        debugData.step = 'not-ok branch (no error string)';
        console.log('[DEBUG] result.ok is false with no error string. Full result:', result);
        setError('Sign-in did not succeed. Check debug info.');
        setDebugInfo(DEBUG_MODE ? debugData : null);
      } else {
        debugData.step = 'success — navigating to /';
        console.log('[DEBUG] Success, navigating to /');
        if (DEBUG_MODE) {
          // Show debug info briefly before navigating so you can read it in Vercel
          setDebugInfo(debugData);
          setTimeout(() => { window.location.href = '/'; }, 2000);
        } else {
          window.location.href = '/';
        }
      }
    } catch (err) {
      debugData.step = 'caught exception';
      debugData.exception = String(err);
      console.error('[DEBUG] signIn threw exception:', err);
      setError('Something went wrong. Please try again.');
      setDebugInfo(DEBUG_MODE ? debugData : null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Hours Tracker</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* DEBUG PANEL — remove before final production deploy */}
          {DEBUG_MODE && (
            <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-xs">
              <p className="font-semibold text-yellow-800 mb-1">🔍 Debug Info</p>
              <p className="text-yellow-700">
                Session status: <strong>{sessionStatus}</strong>
              </p>
              <p className="text-yellow-700">
                Session user: <strong>{session?.user ? JSON.stringify((session.user as { username?: string; role?: string }).username ?? session.user) : 'none'}</strong>
              </p>
              {debugInfo && (
                <pre className="mt-2 text-yellow-900 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
