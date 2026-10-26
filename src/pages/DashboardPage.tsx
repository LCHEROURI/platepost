import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, startOfDay } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import { seedAnalytics } from '@/lib/seed';
import type { Post } from '@/lib/types';
import PostCard from '@/components/PostCard';
import StatusBadge from '@/components/StatusBadge';
import { LineChart } from '@/components/Charts';
import { CalendarIcon, ClockIcon, HeartIcon, PlusIcon, UsersIcon } from '@/components/icons';

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: (p: { size?: number; className?: string }) => JSX.Element;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        <Icon size={18} className="text-accent" aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>
    </div>
  );
}

export default function DashboardPage() {
  const posts = useAppStore((s) => s.posts);
  const restaurant = useAppStore((s) => s.restaurant)!;

  const upcoming = useMemo(
    () =>
      posts
        .filter((p) => p.status === 'scheduled' && p.scheduledAt)
        .sort((a, b) => (a.scheduledAt! < b.scheduledAt! ? -1 : 1)),
    [posts],
  );
  const drafts = useMemo(() => posts.filter((p) => p.status === 'draft'), [posts]);
  const published = useMemo(
    () =>
      posts
        .filter((p) => p.status === 'published')
        .sort((a, b) => ((a.publishedAt ?? '') < (b.publishedAt ?? '') ? 1 : -1)),
    [posts],
  );

  const series = useMemo(() => {
    const points = seedAnalytics(14);
    return points.map((p) => ({ label: format(parseISO(p.date), 'MMM d'), value: p.engagements }));
  }, []);

  const totalEngagement = useMemo(
    () => seedAnalytics(7).reduce((sum, p) => sum + p.engagements, 0),
    [],
  );
  const followers = seedAnalytics(1)[0].followers;

  const today = startOfDay(new Date());

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'} 👋
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {restaurant.name} · {format(today, 'EEEE, MMMM d')}
          </p>
        </div>
        <Link to="/create" className="btn-primary self-start sm:self-auto">
          <PlusIcon size={16} aria-hidden /> Create New Post
        </Link>
      </div>

      <section aria-label="Key analytics snapshot" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Upcoming posts"
          value={String(upcoming.length)}
          sub={`Next: ${upcoming[0] ? format(parseISO(upcoming[0].scheduledAt!), 'EEE, MMM d · h:mm a') : 'nothing scheduled'}`}
          icon={ClockIcon}
        />
        <StatCard label="Published (30d)" value={String(published.length)} sub="Across Instagram & Facebook" icon={CalendarIcon} />
        <StatCard label="Engagement (7d)" value={totalEngagement.toLocaleString()} sub="Likes, comments, shares, saves" icon={HeartIcon} />
        <StatCard label="Followers" value={followers.toLocaleString()} sub="+182 this month" icon={UsersIcon} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section aria-labelledby="upcoming-heading" className="space-y-3 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 id="upcoming-heading" className="text-lg font-bold text-ink">
              Upcoming scheduled posts
            </h2>
            <Link to="/calendar" className="text-sm font-semibold text-accent-700 hover:underline">
              View calendar →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="card p-6 text-center text-sm text-ink-muted">
              Nothing scheduled yet. <Link to="/create" className="font-semibold text-accent-700 hover:underline">Create your first post</Link>.
            </div>
          ) : (
            <ul className="space-y-3">
              {upcoming.slice(0, 4).map((p: Post) => (
                <li key={p.id}>
                  <PostCard post={p} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="snapshot-heading" className="space-y-3">
          <h2 id="snapshot-heading" className="text-lg font-bold text-ink">
            Engagement trend
          </h2>
          <div className="card p-4">
            <LineChart data={series} label="Engagements over the last 14 days" />
            <p className="mt-2 text-xs text-ink-muted">Total engagements per day · last 14 days</p>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section aria-labelledby="recent-heading" className="space-y-3 xl:col-span-2">
          <h2 id="recent-heading" className="text-lg font-bold text-ink">
            Last 3 published posts
          </h2>
          <ul className="space-y-3">
            {published.slice(0, 3).map((p) => (
              <li key={p.id}>
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="drafts-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="drafts-heading" className="text-lg font-bold text-ink">
              Drafts &amp; reviews
            </h2>
            <Link to="/calendar" className="text-sm font-semibold text-accent-700 hover:underline">
              Open calendar →
            </Link>
          </div>
          <div className="card divide-y divide-secondary/30">
            {posts
              .filter((p) => p.status === 'draft' || p.status === 'review_pending' || p.status === 'failed')
              .slice(0, 4)
              .map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3.5">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-secondary/20">
                    {p.mediaUrl && <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{p.caption}</p>
                    {p.failedReason && <p className="truncate text-xs text-red-600">{p.failedReason}</p>}
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            {drafts.length === 0 && posts.filter((p) => p.status === 'draft').length === 0 && (
              <p className="p-4 text-center text-sm text-ink-muted">No drafts right now.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
