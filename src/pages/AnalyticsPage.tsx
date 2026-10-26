import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import { seedAnalytics, seedPostMetrics } from '@/lib/seed';
import { getMetaInsights, type MetaInsights } from '@/lib/meta';
import { CATEGORY_LABELS, type PostCategory } from '@/lib/types';
import { cn, downloadCsv } from '@/lib/utils';
import { BarChart, LineChart } from '@/components/Charts';
import StatusBadge from '@/components/StatusBadge';
import { DownloadIcon, EyeIcon, HeartIcon, UsersIcon } from '@/components/icons';

const RANGES = [7, 14, 30] as const;

function sum(points: ReturnType<typeof seedAnalytics>, key: 'engagements' | 'impressions') {
  return points.reduce((acc, p) => acc + p[key], 0);
}

export default function AnalyticsPage() {
  const posts = useAppStore((s) => s.posts);
  const demoMode = useAppStore((s) => s.demoMode);
  const [range, setRange] = useState<(typeof RANGES)[number]>(14);
  const [sortKey, setSortKey] = useState<'likes' | 'impressions' | 'comments'>('likes');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Live overview numbers from the connected Meta accounts (demo mode keeps samples).
  const [insights, setInsights] = useState<MetaInsights | null>(null);
  const [insightsFailed, setInsightsFailed] = useState(false);

  useEffect(() => {
    if (demoMode) return;
    getMetaInsights()
      .then(setInsights)
      .catch(() => setInsightsFailed(true));
  }, [demoMode]);

  const points = useMemo(() => seedAnalytics(range), [range]);
  const metrics = useMemo(() => seedPostMetrics(posts), [posts]);

  const byPost = useMemo(() => {
    const map = new Map<string, { likes: number; impressions: number; comments: number }>();
    for (const m of metrics) {
      const cur = map.get(m.postId) ?? { likes: 0, impressions: 0, comments: 0 };
      map.set(m.postId, {
        likes: cur.likes + m.likes,
        impressions: cur.impressions + m.impressions,
        comments: cur.comments + m.comments,
      });
    }
    return map;
  }, [metrics]);

  const tableRows = useMemo(() => {
    const rows = posts
      .filter((p) => byPost.has(p.id))
      .map((p) => ({ post: p, ...byPost.get(p.id)! }));
    rows.sort((a, b) => (sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
    return rows;
  }, [posts, byPost, sortKey, sortDir]);

  const engagementSeries = points.map((p) => ({
    label: format(parseISO(p.date), 'MMM d'),
    value: p.engagements,
  }));

  const categorySeries = useMemo(() => {
    const map = new Map<PostCategory, number>();
    for (const [postId, m] of byPost) {
      const post = posts.find((p) => p.id === postId);
      if (!post) continue;
      map.set(post.category, (map.get(post.category) ?? 0) + m.likes + m.comments);
    }
    return [...map.entries()].map(([category, value]) => ({
      label: CATEGORY_LABELS[category].split(' ')[0],
      value,
    }));
  }, [byPost, posts]);

  const first = points[0];
  const last = points[points.length - 1];
  const followerDelta = last.followers - first.followers;
  const publishedCount = posts.filter((p) => p.status === 'published').length;

  const handleExport = () => {
    const rows: Array<Array<string | number>> = [
      ['Post', 'Status', 'Category', 'Likes', 'Comments', 'Impressions'],
      ...tableRows.map((r) => [
        r.post.caption.slice(0, 60),
        r.post.status,
        CATEGORY_LABELS[r.post.category],
        r.likes,
        r.comments,
        r.impressions,
      ]),
    ];
    downloadCsv(`platepost-analytics-${range}d.csv`, rows);
  };

  const toggleSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ink-muted">Post performance across Instagram and Facebook.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div role="group" aria-label="Date range" className="flex rounded-lg border border-secondary/50 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  range === r ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink',
                )}
              >
                {r}d
              </button>
            ))}
          </div>
          <button type="button" onClick={handleExport} className="btn-secondary">
            <DownloadIcon size={15} aria-hidden /> Export CSV
          </button>
        </div>
      </div>

      <section aria-label="Overview metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total engagements',
            value: demoMode
              ? sum(points, 'engagements').toLocaleString()
              : insights
                ? insights.engagementLast7d.toLocaleString()
                : '—',
            sub: demoMode
              ? `Sample · last ${range} days`
              : insights
                ? 'Likes, comments, shares · 7d from Meta'
                : 'Connect Meta accounts for live numbers',
            icon: HeartIcon,
          },
          {
            label: 'Impressions',
            value: demoMode
              ? sum(points, 'impressions').toLocaleString()
              : insights
                ? insights.impressionsLast7d.toLocaleString()
                : '—',
            sub: demoMode
              ? `Sample · last ${range} days`
              : insights
                ? 'Reach of your Page · 7d'
                : 'Connect Meta accounts for live numbers',
            icon: EyeIcon,
          },
          {
            label: 'Follower growth',
            value: demoMode
              ? `${followerDelta >= 0 ? '+' : ''}${followerDelta}`
              : insights
                ? `${(insights.followers.instagram ?? 0) + (insights.followers.facebook ?? 0)}`
                : '—',
            sub: demoMode
              ? `${first.followers.toLocaleString()} → ${last.followers.toLocaleString()}`
              : insights
                ? 'Instagram + Facebook followers'
                : 'Connect Meta accounts for live numbers',
            icon: UsersIcon,
          },
          {
            label: 'Posts published',
            value: String(publishedCount),
            sub: 'From PlatePost publishing',
            icon: DownloadIcon,
          },
        ].map((c) => (
          <div key={c.label} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{c.label}</p>
              <c.icon size={18} className="text-accent" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{c.value}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{c.sub}</p>
          </div>
        ))}
      </section>

      {!demoMode && !insights && insightsFailed && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Charts below show demo data. <Link to="/settings" className="font-semibold underline">Connect your Meta accounts</Link> to see live analytics.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section aria-labelledby="trend-heading" className="card p-5">
          <h2 id="trend-heading" className="mb-3 text-base font-bold text-ink">
            Engagement over time
          </h2>
          <LineChart data={engagementSeries} label={`Engagements, last ${range} days`} />
        </section>
        <section aria-labelledby="category-heading" className="card p-5">
          <h2 id="category-heading" className="mb-3 text-base font-bold text-ink">
            Engagement by category
          </h2>
          <BarChart data={categorySeries} label="Engagements by post category" />
        </section>
      </div>

      <section aria-labelledby="posts-table-heading" className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-secondary/30 px-5 py-4">
          <h2 id="posts-table-heading" className="text-base font-bold text-ink">
            Post performance
          </h2>
          <p className="text-xs text-ink-muted">Click a column to sort</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary/30 text-xs font-bold uppercase tracking-wide text-ink-muted">
                <th scope="col" className="px-5 py-3">Post</th>
                <th scope="col" className="px-3 py-3">Status</th>
                {(
                  [
                    ['likes', 'Likes'],
                    ['comments', 'Comments'],
                    ['impressions', 'Impressions'],
                  ] as const
                ).map(([key, label]) => (
                  <th scope="col" key={key} className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className="inline-flex items-center gap-1 rounded hover:text-ink"
                      aria-label={`Sort by ${label} ${sortKey === key && sortDir === 'asc' ? 'descending' : 'ascending'}`}
                    >
                      {label}
                      <span aria-hidden>{sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/20">
              {tableRows.map((r) => (
                <tr key={r.post.id} className="transition-colors hover:bg-surface/70">
                  <td className="max-w-72 px-5 py-3">
                    <p className="truncate font-medium text-ink">{r.post.caption}</p>
                    <p className="text-xs text-ink-muted">{CATEGORY_LABELS[r.post.category]}</p>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={r.post.status} />
                  </td>
                  <td className="px-3 py-3 tabular-nums">{r.likes.toLocaleString()}</td>
                  <td className="px-3 py-3 tabular-nums">{r.comments.toLocaleString()}</td>
                  <td className="px-3 py-3 tabular-nums">{r.impressions.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
