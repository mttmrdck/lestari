import { Suspense } from 'react';
import { NavLink, Outlet, useLocation, ScrollRestoration, Link } from 'react-router';
import { Home, Search, Puzzle, Layers, UserRound, Flame, CalendarCheck, X } from 'lucide-react';
import { useProgress, useStorageNotice, useStore } from './store';
import { currentStreak } from '../lib/progress';
import { dateKey } from '../lib/date';
import { Wordmark } from '../components/Mascot';
import { ProgressFeedback } from '../components/Toasts';
import { ProgressBar } from '../components/ui';

const NAV = [
  { to: '/', label: 'Utama', icon: Home, end: true },
  { to: '/cari', label: 'Cari', icon: Search },
  { to: '/kuiz', label: 'Kuiz', icon: Puzzle },
  { to: '/kad-imbas', label: 'Kad Imbas', icon: Layers },
  { to: '/profil', label: 'Profil', icon: UserRound },
];

function useToday() {
  const today = dateKey();
  const xpToday = useProgress((s) => s.xpByDay[today] ?? 0);
  const goal = useProgress((s) => s.profile?.dailyGoal ?? 50);
  const activeDays = useProgress((s) => s.activeDays);
  return { xpToday, goal, streak: currentStreak(activeDays, today) };
}

function StreakChip({ streak }: { streak: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sun-soft px-2.5 py-1 text-[0.8125rem] font-[700] text-sun-ink" title="Hari berturut-turut belajar">
      <Flame className={`size-4 ${streak > 0 ? 'text-casque' : 'text-sun-ink/60'}`} strokeWidth={2.2} aria-hidden />
      <span className="tnum">{streak}</span>
      <span className="sr-only">hari berturut-turut</span>
    </span>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  const hasProfile = useProgress((s) => !!s.profile);
  const notice = useStorageNotice();
  const store = useStore();
  const { xpToday, goal, streak } = useToday();
  const bare = pathname === '/' && !hasProfile;

  if (bare) {
    return (
      <>
        {notice && <div className="fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]"><StorageNotice notice={notice} onDismiss={store.dismissNotice} /></div>}
        <Outlet />
        <ProgressFeedback />
        <ScrollRestoration />
      </>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a href="#utama" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">Langkau ke kandungan</a>

      {/* Desktop sidebar */}
      <div className="hidden border-r border-line bg-surface/60 lg:block">
      <aside className="sticky top-0 flex h-dvh flex-col px-4 py-6">
        <Link to="/" className="px-2 no-underline" aria-label="LESTARI, laman utama"><Wordmark /></Link>
        <nav aria-label="Navigasi utama" className="mt-8 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-[0.9375rem] font-[650] no-underline transition-colors duration-150 ${isActive ? 'bg-primary-soft text-on-primary-soft' : 'text-ink-muted hover:bg-surface-sunk hover:text-ink'}`}>
              <Icon className="size-5" strokeWidth={1.9} aria-hidden />
              {label}
            </NavLink>
          ))}
          <NavLink to="/harian" className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-[0.9375rem] font-[650] no-underline transition-colors duration-150 ${isActive ? 'bg-primary-soft text-on-primary-soft' : 'text-ink-muted hover:bg-surface-sunk hover:text-ink'}`}>
            <CalendarCheck className="size-5" strokeWidth={1.9} aria-hidden />
            Peribahasa Hari Ini
          </NavLink>
        </nav>
        <div className="mt-auto rounded-[var(--radius-lg)] border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-[0.8125rem] font-[650] text-ink-muted">Matlamat hari ini</span>
            <StreakChip streak={streak} />
          </div>
          <p className="tnum mt-2 font-display text-[1.375rem] font-[720] leading-none">{xpToday}<span className="text-[0.9375rem] font-[600] text-ink-muted"> / {goal} XP</span></p>
          <ProgressBar value={xpToday} max={goal} label="Kemajuan matlamat XP hari ini" className="mt-3" />
        </div>
      </aside>
      </div>

      <div className="min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line/70 bg-paper px-4 pb-2.5 pt-[calc(10px+env(safe-area-inset-top))] lg:hidden">
          <Link to="/" className="no-underline" aria-label="LESTARI, laman utama"><Wordmark /></Link>
          <div className="flex items-center gap-2">
            <StreakChip streak={streak} />
            <Link to="/profil" className="tnum inline-flex items-center rounded-full bg-surface px-2.5 py-1 text-[0.8125rem] font-[700] no-underline ring-1 ring-line" aria-label={`${xpToday} daripada ${goal} XP hari ini`}>
              {xpToday}<span className="font-[550] text-ink-muted">/{goal} XP</span>
            </Link>
          </div>
        </header>

        <StorageNotice notice={notice} onDismiss={store.dismissNotice} />

        <main id="utama" className="mx-auto w-full max-w-[1080px] px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="mx-auto grid max-w-[560px] grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => `flex min-h-[62px] flex-col items-center justify-center gap-1 text-[0.72rem] font-[650] no-underline transition-colors duration-150 ${isActive ? 'text-primary' : 'text-ink-subtle hover:text-ink'}`}>
                {({ isActive }) => (
                  <>
                    <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors duration-150 ${isActive ? 'bg-primary-soft' : ''}`}>
                      <Icon className="size-5" strokeWidth={isActive ? 2.2 : 1.9} aria-hidden />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <ProgressFeedback />
      <ScrollRestoration />
    </div>
  );
}

function StorageNotice({ notice, onDismiss }: { notice: string | null; onDismiss: () => void }) {
  if (!notice) return null;
  return (
    <div role="status" className="mx-4 mt-3 flex items-start gap-3 rounded-[var(--radius-md)] bg-sun-soft px-4 py-3 text-[0.875rem] text-sun-ink shadow-[var(--shadow-rest)] lg:mx-8">
      <p className="flex-1">{notice}</p>
      <button type="button" onClick={onDismiss} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-sun/30" aria-label="Tutup notis">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuatkan" className="animate-pulse space-y-4">
      <div className="h-9 w-2/3 rounded-lg bg-surface-sunk" />
      <div className="h-28 rounded-[var(--radius-lg)] bg-surface-sunk" />
      <div className="h-28 rounded-[var(--radius-lg)] bg-surface-sunk" />
    </div>
  );
}
