import { useState } from 'react';
import { generateCaptions } from '@/lib/ai';
import { TONE_LABELS, type PostCategory, type Tone } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { HashIcon, SparklesIcon } from './icons';

const MAX_CAPTION_CHARS = 2200;

export default function CaptionEditor({
  caption,
  onCaptionChange,
  hashtags,
  onHashtagsChange,
  category,
  tone,
  onToneChange,
}: {
  caption: string;
  onCaptionChange: (v: string) => void;
  hashtags: string[];
  onHashtagsChange: (v: string[]) => void;
  category: PostCategory;
  tone: Tone;
  onToneChange: (t: Tone) => void;
}) {
  const restaurant = useAppStore((s) => s.restaurant)!;
  const pushToast = useAppStore((s) => s.pushToast);
  const [keywords, setKeywords] = useState('');
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Awaited<ReturnType<typeof generateCaptions>>>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setAiError(null);
    setSuggestions([]);
    try {
      const results = await generateCaptions({
        restaurantName: restaurant.name,
        category,
        keywords: keywords.split(',').filter(Boolean),
        tone,
      });
      setSuggestions(results);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI caption generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const applySuggestion = (text: string, tags: string[]) => {
    onCaptionChange(text);
    onHashtagsChange([...new Set([...hashtags, ...tags])]);
    pushToast('Caption suggestion applied.', 'success');
  };

  const removeHashtag = (tag: string) => onHashtagsChange(hashtags.filter((h) => h !== tag));
  const addHashtag = () => {
    const raw = window.prompt('Add a hashtag (without #)');
    const tag = raw?.trim().replace(/^#/, '').replace(/[^a-zA-Z0-9_]/g, '');
    if (tag && !hashtags.includes(tag)) onHashtagsChange([...hashtags, tag]);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="caption" className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Caption
          </label>
          <span
            className={cn(
              'text-xs font-medium',
              caption.length > MAX_CAPTION_CHARS ? 'text-red-600' : 'text-ink-muted',
            )}
          >
            {caption.length.toLocaleString('en-US')} / {MAX_CAPTION_CHARS.toLocaleString('en-US')}
          </span>
        </div>
        <textarea
          id="caption"
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          rows={5}
          maxLength={MAX_CAPTION_CHARS}
          placeholder="Tell your followers what's cooking…"
          className="input resize-y leading-relaxed"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="ai-keywords" className="label">
            AI keywords <span className="normal-case text-ink-muted/70">(comma-separated, optional)</span>
          </label>
          <input
            id="ai-keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="today's special, vegan dish, happy hour"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="tone" className="label">
            Tone
          </label>
          <select
            id="tone"
            value={tone}
            onChange={(e) => onToneChange(e.target.value as Tone)}
            className="input sm:w-44"
          >
            {(Object.keys(TONE_LABELS) as Tone[]).map((t) => (
              <option key={t} value={t}>
                {TONE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="button" onClick={handleGenerate} disabled={generating} className="btn-primary w-full sm:w-auto">
            <SparklesIcon size={16} aria-hidden />
            {generating ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>
      </div>

      {aiError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
            AI suggestions unavailable
          </p>
          <p className="mt-1 text-sm text-amber-900">{aiError}</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-4" aria-live="polite">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-accent-700">AI suggestions</p>
          <ul className="space-y-2.5">
            {suggestions.map((s, i) => (
              <li key={s.id} className="rounded-lg bg-white p-3 shadow-card">
                <p className="text-sm leading-relaxed text-ink">{s.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {s.hashtags.slice(0, 5).map((h) => (
                    <span key={h} className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-muted">
                      #{h}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => applySuggestion(s.text, s.hashtags)}
                    className="ml-auto text-sm font-semibold text-accent-700 hover:underline"
                  >
                    Use option {i + 1}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label mb-0 flex items-center gap-1.5">
            <HashIcon size={13} aria-hidden /> Hashtags
          </span>
          <button type="button" onClick={addHashtag} className="text-xs font-semibold text-accent-700 hover:underline">
            + Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((h) => (
            <span
              key={h}
              className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-700"
            >
              #{h}
              <button
                type="button"
                onClick={() => removeHashtag(h)}
                className="text-accent-700/70 hover:text-accent-700"
                aria-label={`Remove hashtag ${h}`}
              >
                ✕
              </button>
            </span>
          ))}
          {hashtags.length === 0 && <p className="text-xs text-ink-muted">No hashtags yet.</p>}
        </div>
      </div>
    </div>
  );
}
