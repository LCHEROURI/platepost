import { STATUS_LABELS, type PostStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const STYLES: Record<PostStatus, string> = {
  draft: 'bg-secondary/20 text-primary-600',
  scheduled: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-700',
  review_pending: 'bg-amber-100 text-amber-800',
};

const DOTS: Record<PostStatus, string> = {
  draft: 'bg-primary-600',
  scheduled: 'bg-blue-500',
  published: 'bg-green-500',
  failed: 'bg-red-500',
  review_pending: 'bg-amber-500',
};

export default function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        STYLES[status],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[status])} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}
