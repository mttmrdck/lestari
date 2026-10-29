import { Suspense } from 'react';
import { NavLink, Outlet, useLocation, ScrollRestoration, Link } from 'react-router';
import { Home, Search, Puzzle, Bookmark, UserRound, Flame, CalendarCheck, Map, Layers, X, Sparkles } from 'lucide-react';
import { useProgress, useStorageNotice, useStore } from './store';
import { currentStreak } from '../lib/progress';
import { dateKey } from '../lib/date';
import { Wordmark } from '../components/Mascot';
import { ProgressFeedback } from '../components/Toasts';
import { ConfettiLayer, useCountUp } from '../components/Celebrate';
import { ProgressBar } from '../components/ui';

const NAV = [
  { to: '/', label: 'Utama', icon: Home, match: (p: string) => p === '/' || p.startsWith('/laluan') },
  { to: '/cari', label: 'Cari', icon: Search, match: (p: string) => p.startsWith('/cari') || p.startsWith('/peribahasa') },
  { to: '/kuiz', label: 'Latihan', icon: Puzzle, match: (p: string) => p.startsWith('/kuiz') || p.startsWith('/kad-imbas') || p.startsWith('/harian') },
  { to: '/simpanan', label: 'Simpanan', icon: Bookmark, match: (p: string) => p.startsWith('/simpanan') },
  { to: '/profil', label: 'Profil', icon: UserRound, match: (p: string) => p.startsWith('/profil') || p.startsWith('/tentang') },
];

const EXTRA = [
  { to: '/laluan', label: 'Laluan', icon: Map },
  { to: '/harian', label: 'Peribahasa Hari Ini', icon: CalendarCheck },
  { to: '/kad-imbas', label: 'Kad Imbas', icon: Layers },
];

function useToday() {
  const today = dateKey();
  const xpToday = useProgress((s) => s.xpByDay[today] ?? 0);
  const goal = useProgress((s) => s.profile?.dailyGoal ?? 50);
  const xpTotal = useProgress((s) => s.xpTotal);
  const activeDays = useProgress((s) => s.activeDays);
  return { xpToday, goal, xpTotal, streak: currentStreak(activeDays, today) };
}

function StreakChip({ streak }: { streak: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sun-soft px-2.5 py-1 text-[0.875rem] font-[900] text-sun-ink" title="Hari berturut-turut belajar">
      <Flame className={`size-[18px] ${streak > 0 ? 'text-casque' : 'text-sun-ink/60'}`} strokeWidth={2.6} fill={streak > 0 ? 'currentColor' : 'none'} aria-hidden />
      <span className="tnum">{streak}</span>
      <span className="sr-only">hari berturut-turut</span>
    </span>
  );
}

function XpChip({ xp }: { xp: number }) {
  const shown = useCountUp(xp);
  return (
    <Link to="/profil" className="tnum inline-flex items-center gap-1 rounded-full bg-sky-soft px-2.5 py-1 text-[0.875rem] font-[900] text-sky-ink no-underline" aria-label={`${xp} XP keseluruhan`}>
      <Sparkles className="size-4" strokeWidth={2.6} aria-hidden />{shown}
    </Link>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  const hasProfile = useProgress((s) => !!s.profile);
  const notice = useStorageNotice();
  const store = useStore();
  const { xpToday, goal, xpTotal, streak } = useToday();
  const bare = pathname === '/' && !hasProfile;
  const focused = pathname.startsWith('/pelajaran/');
  const activeIndex = NAV.findIndex((n) => n.match(pathname));
  const active = Math.max(0, activeIndex);

  if (bare) {
    return (
      <>
        {notice && <div className="fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]"><StorageNotice notice={notice} onDismiss={store.dismissNotice} /></div>}
        <Outlet />
        <ProgressFeedback />
        <ConfettiLayer />
        <ScrollRestoration />
      </>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a href="#utama" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">Langkau ke kandungan</a>

      {/* Desktop sidebar */}
      <div className="hidden border-r-2 border-line bg-surface lg:block">
        <aside className="sticky top-0 flex h-dvh flex-col px-4 py-6">
          <Link to="/" className="px-2 no-underline" aria-label="LESTARI, laman utama"><Wordmark /></Link>
          <nav aria-label="Navigasi utama" className="relative mt-8 flex flex-col gap-1.5">
            <span aria-hidden className="absolute inset-x-0 top-0 h-12 rounded-[14px] border-2 border-sky bg-sky-soft transition-[transform,opacity] duration-300 ease-[var(--ease-spring)]" style={{ transform: `translateY(${active * 54}px)`, opacity: activeIndex >= 0 ? 1 : 0 }} />
            {NAV.map(({ to, label, icon: Icon }, i) => (
              <Link key={to} to={to} aria-current={i === activeIndex ? 'page' : undefined} className={`relative flex h-12 items-center gap-3 rounded-[14px] px-3 text-[1rem] font-[850] no-underline transition-colors duration-150 ${i === activeIndex ? 'text-sky-ink' : 'text-ink-muted hover:text-ink'}`}>
                <Icon className="size-[22px]" strokeWidth={2.4} aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 border-t-2 border-line pt-4">
            {EXTRA.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `flex h-11 items-center gap-3 rounded-[12px] px-3 text-[0.9375rem] font-[800] no-underline ${isActive ? 'text-sky-ink' : 'text-ink-muted hover:bg-surface-sunk hover:text-ink'}`}>
                <Icon className="size-5" strokeWidth={2.4} aria-hidden />{label}
              </NavLink>
            ))}
          </div>
          <div className="mt-auto rounded-[var(--radius-lg)] border-2 border-line p-4">
            <div className="flex items-center justify-between gap-2">
              <StreakChip streak={streak} />
              <XpChip xp={xpTotal} />
            </div>
            <p className="mt-3 text-[0.8125rem] font-[800] text-ink-muted">Matlamat hari ini</p>
            <p className="tnum text-[1.25rem] font-[900] leading-tight">{xpToday}<span className="text-[0.9375rem] font-[750] text-ink-muted"> / {goal} XP</span></p>
            <ProgressBar value={xpToday} max={goal} label="Kemajuan matlamat XP hari ini" className="mt-2 h-3" />
          </div>
        </aside>
      </div>

      <div className="min-w-0">
        {!focused && (
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b-2 border-line bg-paper px-4 pb-2.5 pt-[calc(10px+env(safe-area-inset-top))] lg:hidden">
            <Link to="/" className="no-underline" aria-label="LESTARI, laman utama"><Wordmark /></Link>
            <div className="flex items-center gap-2">
              <StreakChip streak={streak} />
              <XpChip xp={xpTotal} />
            </div>
          </header>
        )}

        <StorageNotice notice={notice} onDismiss={store.dismissNotice} />

        <main id="utama" className={`mx-auto w-full max-w-[1080px] px-4 pt-5 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10 ${focused ? 'pb-10' : 'pb-[calc(110px+env(safe-area-inset-bottom))]'}`}>
          <Suspense fallback={<PageSkeleton />}>
            <div key={pathname} className="page-enter">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>

      {!focused && (
        <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
          <ul className="relative mx-auto grid max-w-[560px] grid-cols-5">
            <li aria-hidden className="pointer-events-none absolute top-1.5 h-[34px] w-1/5 px-3 transition-[transform,opacity] duration-300 ease-[var(--ease-spring)]" style={{ transform: `translateX(${active * 100}%)`, opacity: activeIndex >= 0 ? 1 : 0 }}>
              <span className="block h-full rounded-full border-2 border-sky bg-sky-soft" />
            </li>
            {NAV.map(({ to, label, icon: Icon }, i) => (
              <li key={to} className="relative">
                <Link to={to} aria-current={i === activeIndex ? 'page' : undefined} className={`flex min-h-[66px] flex-col items-center justify-center gap-1 pt-1 text-[0.75rem] font-[850] no-underline transition-colors duration-150 ${i === activeIndex ? 'text-sky-ink' : 'text-ink-subtle hover:text-ink'}`}>
                  <Icon className={`size-[22px] transition-transform duration-300 ease-[var(--ease-spring)] ${i === activeIndex ? 'scale-110' : ''}`} strokeWidth={i === activeIndex ? 2.6 : 2.2} aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <ProgressFeedback />
      <ConfettiLayer />
      <ScrollRestoration />
    </div>
  );
}

function StorageNotice({ notice, onDismiss }: { notice: string | null; onDismiss: () => void }) {
  if (!notice) return null;
  return (
    <div role="status" className="mx-4 mt-3 flex items-start gap-3 rounded-[var(--radius-md)] border-2 border-sun-edge bg-sun-soft px-4 py-3 text-[0.9375rem] font-[700] text-sun-ink lg:mx-8">
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
