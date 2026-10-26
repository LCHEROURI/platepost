import { useState, type FormEvent, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-accent"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

function NoRestaurant() {
  const signOut = useAppStore((s) => s.signOut);
  const email = useAppStore((s) => s.user?.email);
  const createRestaurant = useAppStore((s) => s.createRestaurant);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Add a restaurant name to continue.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createRestaurant(name);
      // The store now has a restaurant — the guard renders the dashboard.
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not create the profile. Please try again.',
      );
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="card w-full max-w-md p-8">
        <p className="text-lg font-bold text-ink">No restaurant profile found</p>
        <p className="mt-2 text-sm text-ink-muted">
          {email ? `${email} isn't linked to a restaurant yet.` : 'This account has no restaurant yet.'}{' '}
          Create one below to get started — no need to sign out.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
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
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Creating…' : 'Create restaurant profile'}
          </button>
        </form>

        <div className="mt-6 border-t border-secondary/30 pt-4">
          <button type="button" onClick={() => void signOut()} className="btn-secondary w-full">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Route guard: waits for auth to settle, redirects signed-out visitors to /signin,
 * and only renders the app once the user's restaurant is loaded.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAppStore((s) => s.user);
  const authReady = useAppStore((s) => s.authReady);
  const userDataReady = useAppStore((s) => s.userDataReady);
  const restaurant = useAppStore((s) => s.restaurant);

  if (!authReady) return <Splash />;
  if (!user) return <Navigate to="/signin" replace />;
  if (!userDataReady) return <Splash />;
  if (!restaurant) return <NoRestaurant />;
  return <>{children}</>;
}
