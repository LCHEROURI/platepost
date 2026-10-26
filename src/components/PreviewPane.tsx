import type { Platform, PostCategory } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { CommentIcon, FacebookIcon, HeartIcon, ShareIcon, XBrandIcon } from './icons';

interface PreviewData {
  caption: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'gif';
  hashtags: string[];
  category: PostCategory;
}

function MediaBlock({ data }: { data: PreviewData }) {
  if (data.mediaUrl) {
    return (
      <img src={data.mediaUrl} alt="Post media preview" className="aspect-square w-full rounded-lg object-cover" />
    );
  }
  return (
    <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-secondary/15 text-4xl" aria-hidden>
      🍽️
    </div>
  );
}

function Caption({ data }: { data: PreviewData }) {
  const text = data.caption || 'Your caption will appear here…';
  const tags = data.hashtags.length > 0 ? `\n\n${data.hashtags.map((h) => `#${h}`).join(' ')}` : '';
  return (
    <p className={`whitespace-pre-wrap text-sm leading-relaxed ${data.caption ? 'text-ink' : 'text-ink-muted'}`}>
      {text}
      <span className="text-accent-700">{tags}</span>
    </p>
  );
}

function InstagramMock({ data }: { data: PreviewData }) {
  const restaurant = useAppStore((s) => s.restaurant)!;
  return (
    <div className="rounded-xl border border-secondary/40 bg-white p-3 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent-700">
          {restaurant.name.charAt(0)}
        </div>
        <div className="leading-tight">
          <p className="text-xs font-bold text-ink">{restaurant.name}</p>
          <p className="text-[10px] text-ink-muted">{restaurant.address.split(',')[0]}</p>
        </div>
      </div>
      <MediaBlock data={data} />
      <div className="mt-2 flex gap-3 text-ink">
        <HeartIcon size={17} aria-label="Like" />
        <CommentIcon size={17} aria-label="Comment" />
        <ShareIcon size={17} aria-label="Share" />
      </div>
      <p className="mt-1 text-[11px] text-ink-muted">128 likes · {CATEGORY_LABELS[data.category]}</p>
      <div className="mt-1">
        <Caption data={data} />
      </div>
    </div>
  );
}

function FacebookMock({ data }: { data: PreviewData }) {
  const restaurant = useAppStore((s) => s.restaurant)!;
  return (
    <div className="rounded-xl border border-secondary/40 bg-white p-3 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <FacebookIcon size={16} aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-xs font-bold text-ink">{restaurant.name}</p>
          <p className="text-[10px] text-ink-muted">Just now · 🌎</p>
        </div>
      </div>
      <MediaBlock data={data} />
      <div className="mt-2">
        <Caption data={data} />
      </div>
      <div className="mt-2 flex items-center gap-4 border-t border-secondary/30 pt-2 text-[11px] text-ink-muted">
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>↗ Share</span>
      </div>
    </div>
  );
}

function XMock({ data }: { data: PreviewData }) {
  const restaurant = useAppStore((s) => s.restaurant)!;
  return (
    <div className="rounded-xl border border-secondary/40 bg-white p-3 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white">
          <XBrandIcon size={14} aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-xs font-bold text-ink">{restaurant.name}</p>
          <p className="text-[10px] text-ink-muted">{restaurant.handles.x}</p>
        </div>
      </div>
      <Caption data={data} />
      {data.mediaUrl && <MediaBlock data={data} />}
      <div className="mt-2 flex items-center gap-5 text-[11px] text-ink-muted">
        <span>💬 24</span>
        <span>🔁 18</span>
        <span>❤️ 312</span>
      </div>
    </div>
  );
}

export default function PreviewPane({ data, platforms }: { data: PreviewData; platforms: Platform[] }) {
  if (platforms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-secondary/60 p-8 text-center">
        <p className="text-sm font-semibold text-ink-muted">Select a platform to preview your post</p>
        <p className="mt-1 text-xs text-ink-muted">Live platform mockups will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {platforms.map((p) => {
        if (p === 'instagram') return <InstagramMock key={p} data={data} />;
        if (p === 'facebook') return <FacebookMock key={p} data={data} />;
        return <XMock key={p} data={data} />;
      })}
    </div>
  );
}
