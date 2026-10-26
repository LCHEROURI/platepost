import { formatDate } from '@/lib/utils';
import { PLATFORM_LABELS, type Post } from '@/lib/types';
import StatusBadge from './StatusBadge';
import { ClockIcon, RepeatIcon, FacebookIcon, InstagramIcon, XBrandIcon } from './icons';

const PLATFORM_ICONS = { instagram: InstagramIcon, facebook: FacebookIcon, x: XBrandIcon };

export default function PostCard({ post, onDelete }: { post: Post; onDelete?: (id: string) => void }) {
  return (
    <article className="card flex gap-4 p-4 transition-shadow duration-200 hover:shadow-md">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary/20">
        {post.mediaUrl ? (
          <img src={post.mediaUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl" aria-hidden>
            🍽️
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={post.status} />
          {post.isRecurring && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
              <RepeatIcon size={14} aria-hidden /> Recurring
            </span>
          )}
        </div>

        <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-ink">{post.caption}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          {post.scheduledAt && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon size={13} aria-hidden /> {formatDate(post.scheduledAt)}
            </span>
          )}
          {post.publishedAt && <span>Published {formatDate(post.publishedAt, 'MMM d, yyyy')}</span>}
          <span className="inline-flex items-center gap-1" aria-label="Platforms">
            {post.platforms.map((p) => {
              const Icon = PLATFORM_ICONS[p.platform];
              return (
                <Icon
                  key={p.platform}
                  size={13}
                  aria-label={PLATFORM_LABELS[p.platform]}
                  className="text-ink-muted"
                />
              );
            })}
          </span>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(post.id)}
              className="ml-auto rounded p-1 text-ink-muted hover:bg-red-50 hover:text-red-600"
              aria-label={`Delete post: ${post.caption.slice(0, 40)}`}
            >
              <span aria-hidden>✕</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
