import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { CATEGORY_LABELS, type Platform, type Post, type PostCategory, type Tone } from '@/lib/types';
import { toIsoDateTimeLocal, fromIsoDateTimeLocal, uid } from '@/lib/utils';
import MediaDropzone, { type MediaFile } from '@/components/MediaDropzone';
import CaptionEditor from '@/components/CaptionEditor';
import SchedulePicker, { type ScheduleValue } from '@/components/SchedulePicker';
import PlatformSelector from '@/components/PlatformSelector';
import PreviewPane from '@/components/PreviewPane';
import { publishToMeta } from '@/lib/meta';
import { uploadMediaFromBlob } from '@/lib/storage';

export default function CreatePostPage() {
  const navigate = useNavigate();
  const restaurant = useAppStore((s) => s.restaurant)!;
  const accounts = useAppStore((s) => s.accounts);
  const addOrUpdatePost = useAppStore((s) => s.addOrUpdatePost);
  const pushToast = useAppStore((s) => s.pushToast);

  const [media, setMedia] = useState<MediaFile | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [category, setCategory] = useState<PostCategory>('daily_special');
  const [tone, setTone] = useState<Tone>('casual');
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram']);
  const [watermark, setWatermark] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleValue>({
    mode: 'later',
    scheduledAt: toIsoDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    isRecurring: false,
    recurrence: 'none',
    weeklyDay: 'Monday',
  });

  const buildPost = (status: Post['status']): Post | null => {
    if (!caption.trim()) {
      pushToast('Add a caption before saving.', 'error');
      return null;
    }
    if (platforms.length === 0) {
      pushToast('Select at least one platform.', 'error');
      return null;
    }
    const now = new Date().toISOString();
    const statusForPlatform = status === 'draft' ? 'draft' : 'scheduled';
    return {
      id: uid(),
      restaurantId: restaurant.id,
      ownerId: restaurant.ownerId,
      creatorId: restaurant.ownerId,
      caption: caption.trim(),
      mediaUrl: media?.url,
      mediaType: media?.mediaType ?? 'image',
      status,
      scheduledAt: schedule.mode === 'later' ? fromIsoDateTimeLocal(schedule.scheduledAt).toISOString() : undefined,
      publishedAt: undefined,
      category,
      isRecurring: schedule.isRecurring,
      recurrence: schedule.isRecurring ? schedule.recurrence : 'none',
      platforms: platforms.map((p) => ({
        platform: p,
        accountId: accounts.find((a) => a.platform === p)?.id,
        status: statusForPlatform,
      })),
      hashtags,
      watermark,
      tone,
      createdAt: now,
      updatedAt: now,
    };
  };

  const handleSaveDraft = () => {
    const post = buildPost('draft');
    if (!post) return;
    addOrUpdatePost(post);
    pushToast('Draft saved.', 'success');
    navigate('/calendar');
  };

  const handleSchedule = async () => {
    const post = buildPost('scheduled');
    if (!post) return;

    if (schedule.mode === 'later') {
      addOrUpdatePost(post);
      pushToast('Post scheduled successfully.', 'success');
      navigate('/calendar');
      return;
    }

    // Publish now — real Graph API publishing through the Meta service.
    setPublishing(true);
    try {
      let mediaUrl: string | null = post.mediaUrl ?? null;
      if (mediaUrl?.startsWith('blob:')) {
        mediaUrl = await uploadMediaFromBlob(mediaUrl);
      } else if (mediaUrl?.startsWith('data:')) {
        mediaUrl = null; // demo placeholders have no public URL
      }
      const { results } = await publishToMeta({
        caption: post.caption,
        hashtags: post.hashtags,
        mediaUrl,
        platforms: post.platforms.map((p) => p.platform),
      });

      const failed = results.filter((r) => !r.ok);
      post.status =
        results.length > 0 && failed.length < results.length ? 'published' : 'failed';
      post.publishedAt = post.status === 'published' ? new Date().toISOString() : undefined;
      post.failedReason =
        failed.map((r) => `${r.platform}: ${r.error}`).join(' · ') || undefined;
      post.platforms = post.platforms.map((p) => {
        const r = results.find((x) => x.platform === p.platform);
        return r
          ? {
              ...p,
              status: (r.ok ? 'published' : 'failed') as 'published' | 'failed',
              platformPostId: r.platformPostId ?? undefined,
            }
          : p;
      });
      addOrUpdatePost(post);
      pushToast(
        post.status === 'published'
          ? 'Published to your Meta accounts.'
          : 'Publishing completed with errors — see the post status.',
        post.status === 'published' ? 'success' : 'error',
      );
      navigate('/calendar');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Publishing failed. Please try again.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Create Post</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Media, caption, schedule and platforms — preview updates live on the right.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card space-y-4 p-5" aria-labelledby="media-heading">
            <h2 id="media-heading" className="text-base font-bold text-ink">
              1 · Media
            </h2>
            <MediaDropzone
              media={media}
              onChange={setMedia}
              watermark={watermark}
              watermarkText={`© ${restaurant.name}`}
            />
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={watermark}
                onChange={(e) => setWatermark(e.target.checked)}
                className="accent-[#38B2AC]"
              />
              Overlay logo / watermark
            </label>
          </section>

          <section className="card space-y-4 p-5" aria-labelledby="caption-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="caption-heading" className="text-base font-bold text-ink">
                2 · Caption
              </h2>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PostCategory)}
                  className="input w-auto py-1.5"
                  aria-label="Post category"
                >
                  {(Object.keys(CATEGORY_LABELS) as PostCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <CaptionEditor
              caption={caption}
              onCaptionChange={setCaption}
              hashtags={hashtags}
              onHashtagsChange={setHashtags}
              category={category}
              tone={tone}
              onToneChange={setTone}
            />
          </section>

          <section className="card space-y-4 p-5" aria-labelledby="schedule-heading">
            <h2 id="schedule-heading" className="text-base font-bold text-ink">
              3 · Schedule
            </h2>
            <SchedulePicker value={schedule} onChange={setSchedule} />
          </section>

          <section className="card space-y-4 p-5" aria-labelledby="platforms-heading">
            <h2 id="platforms-heading" className="text-base font-bold text-ink">
              4 · Platforms
            </h2>
            <PlatformSelector selected={platforms} onChange={setPlatforms} />
          </section>

          <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-3 rounded-xl border border-secondary/30 bg-white/95 p-4 shadow-md backdrop-blur sm:flex-row sm:items-center sm:justify-end">
            <button type="button" onClick={handleSaveDraft} className="btn-secondary w-full sm:w-auto">
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => void handleSchedule()}
              disabled={publishing}
              className="btn-primary w-full sm:w-auto"
            >
              {publishing
                ? 'Publishing…'
                : schedule.mode === 'now'
                  ? 'Publish Now'
                  : 'Schedule Post'}
            </button>
          </div>
        </div>

        <aside className="xl:sticky xl:top-10 xl:self-start" aria-label="Post preview">
          <h2 className="mb-3 text-base font-bold text-ink">Preview</h2>
          <PreviewPane
            data={{ caption, mediaUrl: media?.url, mediaType: media?.mediaType ?? 'image', hashtags, category }}
            platforms={platforms}
          />
        </aside>
      </div>
    </div>
  );
}
