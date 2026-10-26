import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { ImageIcon, TrashIcon, UploadIcon } from './icons';

export interface MediaFile {
  url: string;
  name: string;
  mediaType: 'image' | 'video' | 'gif';
}

const MAX_SIZE_MB = 50;
const MAX_VIDEO_SECONDS = 60;

function classify(file: File): MediaFile['mediaType'] {
  if (file.type === 'image/gif') return 'gif';
  if (file.type.startsWith('video/')) return 'video';
  return 'image';
}

export default function MediaDropzone({
  media,
  onChange,
  watermark,
  watermarkText,
}: {
  media: MediaFile | null;
  onChange: (media: MediaFile | null) => void;
  watermark: boolean;
  watermarkText: string;
}) {
  const pushToast = useAppStore((s) => s.pushToast);
  const [videoTooLong, setVideoTooLong] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        pushToast(
          `Rejected: ${rejected.map((r) => r.file.name).join(', ')} — unsupported type or file too large (max ${MAX_SIZE_MB} MB).`,
          'error',
        );
        return;
      }
      const file = accepted[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      onChange({ url, name: file.name, mediaType: classify(file) });
    },
    [onChange, pushToast],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    maxFiles: 1,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
  });

  // Client-side validation: videos must be 60s or shorter.
  useEffect(() => {
    setVideoTooLong(false);
    if (media?.mediaType !== 'video' || !videoRef.current) return;
    const el = videoRef.current;
    const check = () => {
      if (el.duration > MAX_VIDEO_SECONDS) {
        setVideoTooLong(true);
        pushToast(`Video is ${Math.round(el.duration)}s — max length is ${MAX_VIDEO_SECONDS}s.`, 'error');
      }
    };
    el.addEventListener('loadedmetadata', check);
    return () => el.removeEventListener('loadedmetadata', check);
  }, [media, pushToast]);

  return (
    <div>
      {media ? (
        <div className="relative">
          {media.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={media.url}
              controls
              className="aspect-square w-full rounded-xl object-cover"
            />
          ) : (
            <img src={media.url} alt="Uploaded media preview" className="aspect-square w-full rounded-xl object-cover" />
          )}
          {watermark && (
            <span className="pointer-events-none absolute bottom-3 right-3 rounded bg-ink/45 px-2 py-1 text-xs font-semibold text-white">
              {watermarkText}
            </span>
          )}
          {videoTooLong && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600">
              This video exceeds 60 seconds and cannot be published. Please trim or replace it.
            </p>
          )}
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ink-muted">
            <span className="truncate">{media.name}</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-red-600 hover:bg-red-50"
            >
              <TrashIcon size={14} aria-hidden /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-200',
            isDragActive ? 'border-accent bg-accent/5' : 'border-secondary/60 hover:border-accent hover:bg-surface',
          )}
        >
          <input {...getInputProps()} aria-label="Upload media" />
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-muted">
            {isDragActive ? <ImageIcon size={22} /> : <UploadIcon size={22} />}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Drag &amp; drop files here, or click to upload</p>
            <p className="mt-1 text-xs text-ink-muted">
              Images, GIFs, or videos up to {MAX_VIDEO_SECONDS}s · max {MAX_SIZE_MB} MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
