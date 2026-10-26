import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import {
  disconnectMeta,
  getMetaStatus,
  startMetaOAuth,
  type MetaStatus,
} from '@/lib/meta';
import { CheckIcon, FacebookIcon, InstagramIcon, XBrandIcon } from '@/components/icons';

type Tab = 'profile' | 'social' | 'subscription' | 'branding';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'profile', label: 'Restaurant Profile' },
  { id: 'social', label: 'Social Accounts' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'branding', label: 'Branding' },
];

export default function SettingsPage() {
  const restaurant = useAppStore((s) => s.restaurant)!;
  const updateRestaurant = useAppStore((s) => s.updateRestaurant);
  const demoMode = useAppStore((s) => s.demoMode);
  const pushToast = useAppStore((s) => s.pushToast);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('profile');
  const [form, setForm] = useState({ ...restaurant });

  // Meta connection state (real OAuth flow through the Cloud Run service).
  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null);
  const [metaBusy, setMetaBusy] = useState(false);

  const refreshMetaStatus = () => {
    if (demoMode) return;
    getMetaStatus()
      .then(setMetaStatus)
      .catch(() => setMetaStatus({ connected: false }));
  };

  useEffect(() => {
    refreshMetaStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode]);

  useEffect(() => {
    const result = searchParams.get('meta');
    if (result === 'connected') {
      pushToast('Facebook Page connected — you can now publish from PlatePost.', 'success');
      setTab('social');
      refreshMetaStatus();
    } else if (result === 'error') {
      const msg = searchParams.get('msg');
      pushToast(`Connection failed: ${msg ?? 'unknown error'}`, 'error');
      setTab('social');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleConnect = async () => {
    setMetaBusy(true);
    try {
      const { authorizeUrl } = await startMetaOAuth(`${window.location.origin}/settings`);
      window.location.href = authorizeUrl;
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not start the connection flow.', 'error');
      setMetaBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setMetaBusy(true);
    try {
      await disconnectMeta();
      setMetaStatus({ connected: false });
      pushToast('Meta accounts disconnected.', 'info');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not disconnect.', 'error');
    } finally {
      setMetaBusy(false);
    }
  };

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateRestaurant({
      name: form.name,
      contactEmail: form.contactEmail,
      phone: form.phone,
      address: form.address,
      workingHours: form.workingHours,
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Manage your restaurant, accounts and subscription.</p>
      </header>

      <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-1 border-b border-secondary/30">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors',
              tab === t.id
                ? 'border-accent text-accent-700'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="card max-w-2xl space-y-5 p-6">
          <h2 className="text-base font-bold text-ink">Restaurant details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="r-name" className="label">Restaurant name</label>
              <input id="r-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="r-email" className="label">Contact email</label>
              <input id="r-email" type="email" className="input" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="r-phone" className="label">Phone number</label>
              <input id="r-phone" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="r-address" className="label">Address</label>
              <input id="r-address" className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="r-hours" className="label">Working hours</label>
              <input id="r-hours" className="input" value={form.workingHours} onChange={(e) => setForm({ ...form, workingHours: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">Save changes</button>
          </div>
        </form>
      )}

      {tab === 'social' && (
        <section className="max-w-2xl space-y-3" aria-label="Connected social accounts">
          <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <FacebookIcon size={22} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Facebook Page + Instagram</p>
              <p className="truncate text-sm text-ink-muted">
                {metaStatus?.connected
                  ? `Connected: ${metaStatus.pageName ?? 'your Page'}${
                      metaStatus.igUsername ? ` · @${metaStatus.igUsername}` : ' · no Instagram account linked'
                    }`
                  : 'Connect through Meta login to publish to your Facebook Page and Instagram business account.'}
              </p>
            </div>
            {metaStatus?.connected ? (
              <button
                type="button"
                onClick={() => void handleDisconnect()}
                disabled={metaBusy}
                className="btn-secondary"
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleConnect()}
                disabled={metaBusy || demoMode}
                className="btn-primary"
              >
                {metaBusy ? 'Opening Meta…' : 'Connect with Facebook'}
              </button>
            )}
          </div>

          <div className="card flex items-center gap-4 p-5 opacity-60">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-ink">
              <InstagramIcon size={22} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Instagram (direct)</p>
              <p className="truncate text-sm text-ink-muted">
                Instagram publishing uses the business account linked to your Facebook Page.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
              <CheckIcon size={14} aria-hidden /> Via Page
            </span>
          </div>

          <div className="card flex items-center gap-4 p-5 opacity-60">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-ink">
              <XBrandIcon size={22} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">X (Twitter)</p>
              <p className="truncate text-sm text-ink-muted">Coming soon.</p>
            </div>
          </div>

          <p className="text-xs text-ink-muted">
            Connection tokens are stored server-side only (Firestore, invisible to the app) and the Meta App
            Secret lives in Google Secret Manager — never in the app or the repo.
          </p>
        </section>
      )}

      {tab === 'subscription' && (
        <section aria-label="Subscription plans" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[
            {
              name: 'Free',
              price: '$0',
              features: ['1 restaurant', '10 scheduled posts / month', '1 social platform', 'Basic analytics'],
              current: false,
            },
            {
              name: 'Pro',
              price: '$29',
              features: ['1 restaurant', 'Unlimited scheduling', 'Instagram + Facebook', 'AI captions (100 / month)', 'Full analytics + CSV'],
              current: true,
            },
            {
              name: 'Business',
              price: '$79',
              features: ['Multiple locations', 'Everything in Pro', 'Approval workflows', 'Priority support'],
              current: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={cn('card p-6', plan.current && 'border-accent ring-1 ring-accent')}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-ink">{plan.name}</h3>
                {plan.current && (
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent-700">
                    Current plan
                  </span>
                )}
              </div>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-ink">
                {plan.price}
                <span className="text-sm font-medium text-ink-muted"> / month</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-ink">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckIcon size={15} className="mt-0.5 shrink-0 text-accent-700" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <button type="button" disabled={plan.current} className={plan.current ? 'btn-secondary mt-6 w-full' : 'btn-primary mt-6 w-full'}>
                {plan.current ? 'Current plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </section>
      )}

      {tab === 'branding' && (
        <div className="card max-w-2xl space-y-5 p-6">
          <h2 className="text-base font-bold text-ink">Default post branding</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="brand-color" className="label">Brand color</label>
              <div className="flex items-center gap-3">
                <input
                  id="brand-color"
                  type="color"
                  value={restaurant.brandColor}
                  onChange={(e) => updateRestaurant({ brandColor: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-secondary/50 bg-white p-1"
                />
                <code className="text-sm text-ink-muted">{restaurant.brandColor}</code>
              </div>
            </div>
            <div>
              <label htmlFor="brand-font" className="label">Font family</label>
              <select
                id="brand-font"
                value={restaurant.fontFamily}
                onChange={(e) => updateRestaurant({ fontFamily: e.target.value })}
                className="input"
              >
                {['Inter', 'Roboto', 'Lato', 'Georgia'].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="rounded-xl border border-secondary/30 p-5" style={{ backgroundColor: '#F7FAFC' }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Preview</p>
            <p className="mt-2 text-xl font-bold" style={{ color: restaurant.brandColor, fontFamily: restaurant.fontFamily }}>
              {restaurant.name}
            </p>
            <p className="mt-1 text-sm text-ink-muted" style={{ fontFamily: restaurant.fontFamily }}>
              Sample branded caption — consistent across all posts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
