import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import ToastHost from './ToastHost';
import {
  CalendarIcon,
  ChartIcon,
  CogIcon,
  HomeIcon,
  MenuIcon,
  PlusIcon,
  XIcon,
} from './icons';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: HomeIcon, end: true },
  { to: '/create', label: 'Create Post', icon: PlusIcon, end: false },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon, end: false },
  { to: '/analytics', label: 'Analytics', icon: ChartIcon, end: false },
  { to: '/settings', label: 'Settings', icon: CogIcon, end: false },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white" aria-hidden>
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
          <path d="M10 17a6 6 0 0 1 12 0v4h-4v-4a2 2 0 0 0-4 0v4h-4v-4z" />
        </svg>
      </div>
      <div className="leading-tight">
        <p className="text-base font-extrabold tracking-tight text-ink">PlatePost</p>
        <p className="text-[11px] font-medium text-ink-muted">Social media manager</p>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200',
              isActive
                ? 'bg-accent/10 text-accent-700'
                : 'text-ink-muted hover:bg-primary/5 hover:text-ink',
            )
          }
        >
          <Icon size={18} aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const restaurant = useAppStore((s) => s.restaurant);
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <Brand />
      </div>
      <div className="flex-1 px-3">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="border-t border-secondary/30 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {restaurant.name.charAt(0)}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-ink">{restaurant.name}</p>
            <p className="truncate text-xs text-ink-muted">{restaurant.workingHours}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-secondary/30 bg-white lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside
            className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-5 rounded-lg p-1.5 text-ink-muted hover:bg-surface"
              aria-label="Close menu"
            >
              <XIcon size={18} />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-secondary/30 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-2 text-ink hover:bg-surface"
          aria-label="Open menu"
        >
          <MenuIcon size={20} />
        </button>
        <Brand />
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>

      <ToastHost />
    </div>
  );
}
