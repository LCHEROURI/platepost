import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

type Mode = 'signin' | 'signup';

export default function SignInPage() {
  const user = useAppStore((s) => s.user);
  const authReady = useAppStore((s) => s.authReady);
  const demoMode = useAppStore((s) => s.demoMode);
  const signIn = useAppStore((s) => s.signIn);
  const signUp = useAppStore((s) => s.signUp);

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already authenticated (or demo mode) — go straight to the dashboard.
  if (authReady && (user || demoMode)) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setError('Add your restaurant name to create an account.');
          return;
        }
        await signUp(email.trim(), password, name.trim());
      } else {
        await signIn(email.trim(), password);
      }
      // On success the auth listener loads the restaurant and the guard navigates.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white"
            aria-hidden
          >
            <svg viewBox="0 0 32 32" className="h-6 w-6" fill="currentColor">
              <path d="M10 17a6 6 0 0 1 12 0v4h-4v-4a2 2 0 0 0-4 0v4h-4v-4z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">PlatePost</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Social media for your restaurant — planned, scheduled, published.
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          <div role="tablist" aria-label="Authentication mode" className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-surface p-1">
            {(
              [
                ['signin', 'Sign in'],
                ['signup', 'Create account'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                  mode === m ? 'bg-white text-ink shadow-card' : 'text-ink-muted hover:text-ink',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'signup' && (
              <div>
                <label htmlFor="restaurant-name" className="label">
                  Restaurant name
                </label>
                <input
                  id="restaurant-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Luna Kitchen"
                  className="input"
                  autoComplete="organization"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@restaurant.com"
                className="input"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                className="input"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={6}
                required
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-relaxed text-ink-muted">
            {mode === 'signup'
              ? 'Creating an account also creates your restaurant profile. '
              : 'No account yet? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setError(null);
              }}
              className="font-semibold text-accent-700 hover:underline"
            >
              {mode === 'signup' ? 'Sign in instead' : 'Create one'}
            </button>
          </p>

          {demoMode && (
            <p className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-accent-700">
              Demo mode — Firebase isn't configured, so you're signed in as a local demo user.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
