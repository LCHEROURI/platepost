import { PLATFORM_LABELS, type Platform } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { FacebookIcon, InstagramIcon, XBrandIcon } from './icons';

const PLATFORM_ICONS = { instagram: InstagramIcon, facebook: FacebookIcon, x: XBrandIcon };

export default function PlatformSelector({
  selected,
  onChange,
}: {
  selected: Platform[];
  onChange: (v: Platform[]) => void;
}) {
  const accounts = useAppStore((s) => s.accounts);

  const toggle = (platform: Platform) => {
    onChange(selected.includes(platform) ? selected.filter((p) => p !== platform) : [...selected, platform]);
  };

  return (
    <fieldset>
      <legend className="label mb-2">Publish to</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(Object.keys(PLATFORM_LABELS) as Platform[]).map((platform) => {
          const account = accounts.find((a) => a.platform === platform);
          const connected = Boolean(account?.connected);
          const active = selected.includes(platform);
          const Icon = PLATFORM_ICONS[platform];
          return (
            <button
              key={platform}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(platform)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition-all duration-200',
                active
                  ? 'border-accent bg-accent/10 text-accent-700'
                  : 'border-secondary/50 text-ink-muted hover:border-secondary',
              )}
              title={
                connected
                  ? PLATFORM_LABELS[platform]
                  : `${PLATFORM_LABELS[platform]} — not connected yet (publishing is a placeholder)`
              }
            >
              <Icon size={17} aria-hidden />
              <span className="flex-1 text-left">{PLATFORM_LABELS[platform]}</span>
              <span className="text-xs font-medium text-ink-muted">{connected ? 'Connected' : 'Not connected'}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
