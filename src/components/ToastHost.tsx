import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { AlertIcon, CheckIcon, InfoIcon } from './icons';

const ICONS = {
  success: CheckIcon,
  error: AlertIcon,
  info: InfoIcon,
};

const COLORS = {
  success: 'border-green-200 text-green-800',
  error: 'border-red-200 text-red-800',
  info: 'border-primary/20 text-ink',
};

export default function ToastHost() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-white p-3.5 shadow-md',
              COLORS[t.kind],
            )}
          >
            <Icon size={17} className="mt-0.5 shrink-0" aria-hidden />
            <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 text-current opacity-60 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <span aria-hidden>✕</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
