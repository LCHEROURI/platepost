import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, startOfDay } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import { seedAnalytics } from '@/lib/seed';
import { getMetaInsights, type MetaInsights } from '@/lib/meta';
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
  const demoMode = useAppStore((s) => s.demoMode);

  // Live numbers come from the connected Meta accounts; demo mode keeps samples.
  const [insights, setInsights] = useState<MetaInsights | null>(null);
  const [insightsFailed, setInsightsFailed] = useState(false);

  useEffect(() => {
    if (demoMode) return;
    getMetaInsights()
      .then(setInsights)
      .catch(() => setInsightsFailed(true));
  }, [demoMode]);

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

  // Demo-only sample series (used only when Firebase/Meta are not configured).
  const series = useMemo(() => {
    const points = seedAnalytics(14);
    return points.map((p) => ({ label: format(parseISO(p.date), 'MMM d'), value: p.engagements }));
  }, []);
  const demoSample = useMemo(
    () => ({
      engagement: seedAnalytics(7).reduce((sum, p) => sum + p.engagements, 0),
      followers: seedAnalytics(1)[0].followers,
    }),
    [],
  );

  const connected = Boolean(insights && !insightsFailed);
  const totalFollowers = insights
    ? (insights.followers.instagram ?? 0) + (insights.followers.facebook ?? 0)
    : 0;
  const followerSub = insights
    ? `Instagram ${insights.followers.instagram?.toLocaleString('en-US') ?? '—'} · Facebook ${insights.followers.facebook?.toLocaleString('en-US') ?? '—'}`
    : '';

  const engagementValue = demoMode
    ? demoSample.engagement.toLocaleString('en-US')
    : connected
      ? insights!.engagementLast7d.toLocaleString('en-US')
      : '—';
  const followerValue = demoMode
    ? demoSample.followers.toLocaleString('en-US')
    : connected
      ? totalFollowers.toLocaleString('en-US')
      : '—';

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
        <StatCard label="Published (30d)" value={String(published.length)} sub="From PlatePost publishing" icon={CalendarIcon} />
        <StatCard
          label="Engagement (7d)"
          value={engagementValue}
          sub={demoMode ? 'Sample data (demo mode)' : connected ? 'Likes, comments, shares from Meta' : 'Connect Meta accounts for live numbers'}
          icon={HeartIcon}
        />
        <StatCard
          label="Followers"
          value={followerValue}
          sub={demoMode ? 'Sample data (demo mode)' : connected ? followerSub : 'Connect Meta accounts for live numbers'}
          icon={UsersIcon}
        />
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
            Live account overview
          </h2>
          {demoMode ? (
            <div className="card p-4">
              <LineChart data={series} label="Engagements over the last 14 days (demo data)" />
              <p className="mt-2 text-xs text-ink-muted">Sample engagements per day · demo mode</p>
            </div>
          ) : connected ? (
            <div className="card p-5">
              <p className="text-sm font-bold text-ink">{insights!.pageName ?? 'Your Page'}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Instagram followers</dt>
                  <dd className="font-semibold tabular-nums text-ink">
                    {insights!.followers.instagram?.toLocaleString('en-US') ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Facebook followers</dt>
                  <dd className="font-semibold tabular-nums text-ink">
                    {insights!.followers.facebook?.toLocaleString('en-US') ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Engagement (7d)</dt>
                  <dd className="font-semibold tabular-nums text-ink">
                    {insights!.engagementLast7d.toLocaleString('en-US')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Impressions (7d)</dt>
                  <dd className="font-semibold tabular-nums text-ink">
                    {insights!.impressionsLast7d.toLocaleString('en-US')}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="card p-5 text-center">
              <p className="text-sm text-ink-muted">
                Connect your Facebook Page and Instagram to see live follower and engagement numbers.
              </p>
              <Link to="/settings" className="btn-primary mt-4">
                Connect accounts
              </Link>
            </div>
          )}
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
