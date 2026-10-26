import { Link } from 'react-router-dom';
import { HomeIcon } from '@/components/icons';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-7xl font-extrabold tracking-tight text-secondary/60">404</p>
      <h1 className="mt-3 text-xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        The page you're looking for doesn't exist or has been moved. Let's get you back to the kitchen.
      </p>
      <Link to="/" className="btn-primary mt-6">
        <HomeIcon size={16} aria-hidden /> Back to Dashboard
      </Link>
    </div>
  );
}
