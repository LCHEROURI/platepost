import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import type { Post } from '@/lib/types';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';
import PostCard from '@/components/PostCard';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@/components/icons';

const STATUS_DOT: Record<Post['status'], string> = {
  draft: 'bg-primary-600',
  scheduled: 'bg-blue-500',
  published: 'bg-green-500',
  failed: 'bg-red-500',
  review_pending: 'bg-amber-500',
};

export default function CalendarPage() {
  const posts = useAppStore((s) => s.posts);
  const removePost = useAppStore((s) => s.removePost);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Post | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month)),
        end: endOfWeek(endOfMonth(month)),
      }),
    [month],
  );

  const postsForDay = (day: Date) =>
    posts.filter((p) => {
      const d = parseISO(p.scheduledAt ?? p.publishedAt ?? p.createdAt);
      return isSameDay(d, day);
    });

  const handleDelete = () => {
    if (!selected) return;
    removePost(selected.id);
    setSelected(null);
    setConfirmingDelete(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Calendar</h1>
          <p className="mt-1 text-sm text-ink-muted">Scheduled and published posts at a glance.</p>
        </div>
        <Link to="/create" className="btn-primary self-start sm:self-auto">
          <PlusIcon size={16} aria-hidden /> Add New Post
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-secondary/30 px-4 py-3">
          <button
            type="button"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="rounded-lg p-2 text-ink-muted hover:bg-surface hover:text-ink"
            aria-label="Previous month"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <h2 className="text-base font-bold text-ink" aria-live="polite">
            {format(month, 'MMMM yyyy')}
          </h2>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="rounded-lg p-2 text-ink-muted hover:bg-surface hover:text-ink"
            aria-label="Next month"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-secondary/30 text-center text-xs font-bold uppercase tracking-wide text-ink-muted">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayPosts = postsForDay(day);
            const inMonth = isSameMonth(day, month);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'min-h-24 border-b border-r border-secondary/20 p-1.5 last:border-r-0 sm:min-h-28',
                  !inMonth && 'bg-surface/60',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    isToday ? 'bg-accent text-white' : inMonth ? 'text-ink' : 'text-ink-muted/50',
                  )}
                >
                  {format(day, 'd')}
                </span>
                <ul className="mt-1 space-y-1">
                  {dayPosts.slice(0, 3).map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(p)}
                        className="flex w-full items-center gap-1.5 rounded-md bg-surface px-1.5 py-1 text-left text-[11px] font-medium text-ink transition-colors hover:bg-accent/10"
                        aria-label={`${p.status}: ${p.caption.slice(0, 50)}`}
                      >
                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[p.status])} aria-hidden />
                        <span className="truncate">{format(parseISO(p.scheduledAt ?? p.publishedAt ?? p.createdAt), 'h:mm a')} · {p.caption}</span>
                      </button>
                    </li>
                  ))}
                  {dayPosts.length > 3 && (
                    <li className="px-1.5 text-[11px] font-semibold text-ink-muted">+{dayPosts.length - 3} more</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <section aria-labelledby="queue-heading">
        <h2 id="queue-heading" className="mb-3 text-lg font-bold text-ink">
          Up next
        </h2>
        <ul className="space-y-3">
          {posts
            .filter((p) => p.status === 'scheduled' && p.scheduledAt)
            .sort((a, b) => (a.scheduledAt! < b.scheduledAt! ? -1 : 1))
            .slice(0, 5)
            .map((p) => (
              <li key={p.id}>
                <PostCard post={p} />
              </li>
            ))}
        </ul>
      </section>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title="Post details">
        {selected && (
          <div className="space-y-4">
            <PostCard post={selected} />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="btn-secondary text-red-600 hover:border-red-200 hover:bg-red-50"
              >
                Delete
              </button>
              <Link to="/create" className="btn-primary" onClick={() => setSelected(null)}>
                Duplicate &amp; edit
              </Link>
            </div>
            {confirmingDelete && (
              <div
                role="alertdialog"
                aria-label="Confirm deletion"
                className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3"
              >
                <p className="text-sm font-medium text-red-800">Delete this post permanently?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmingDelete(false)} className="btn-secondary px-3 py-1.5 text-xs">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Yes, delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
