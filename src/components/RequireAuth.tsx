import type { ReactNode } from 'react';
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
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="card w-full max-w-md p-8 text-center">
        <p className="text-lg font-bold text-ink">No restaurant profile found</p>
        <p className="mt-2 text-sm text-ink-muted">
          {email ? `${email} isn't linked to a restaurant yet.` : 'This account has no restaurant yet.'}{' '}
          Sign out and create a new account to set one up.
        </p>
        <button type="button" onClick={() => void signOut()} className="btn-primary mt-6">
          Sign out
        </button>
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
