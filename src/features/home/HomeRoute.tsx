import { useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowRight, Search, Smile, TextCursorInput, MessagesSquare, Layers, BookOpenCheck, Flame, Sparkles, Trophy, Star, Gift } from 'lucide-react';
import { useProgress } from '../../app/store';
import { Welcome } from './Welcome';
import { Mascot } from '../../components/Mascot';
import { ProgressBar } from '../../components/ui';
import { UnitBanner, PathNodes } from '../../components/LearningPath';
import { AchievementBadge } from '../../components/Badge';
import { useCountUp } from '../../components/Celebrate';
import { CORE } from '../../lib/data';
import { ACHIEVEMENTS, currentStreak, masteredIds } from '../../lib/progress';
import { dateKey } from '../../lib/date';
import { dailyAnswer, dailyPool } from '../../lib/daily';
import { UNITS, LESSONS, nodeStates, currentLesson } from '../../lib/lessons';
import { buildQueues } from '../flashcards/queue';
import { useDocumentTitle, useReducedMotion } from '../../hooks/media';

export function HomeRoute() {
  const hasProfile = useProgress((s) => !!s.profile);
  return hasProfile ? <Home /> : <Welcome />;
}

const pool = dailyPool(CORE);

const ACTIVITIES = [
  { to: '/cari', icon: Search, title: 'Cari Peribahasa', text: 'Kata kunci atau situasi', tone: 'sky' },
  { to: '/kuiz/maksud', icon: BookOpenCheck, title: 'Teka Maksud', text: 'Pilih maksud yang betul', tone: 'green' },
  { to: '/kuiz/konteks', icon: MessagesSquare, title: 'Padankan Situasi', text: 'Peribahasa ikut konteks', tone: 'rose' },
  { to: '/kuiz/kosong', icon: TextCursorInput, title: 'Lengkapkan', text: 'Isi perkataan yang hilang', tone: 'lavender' },
  { to: '/kuiz/emoji', icon: Smile, title: 'Kuiz Emoji', text: 'Teka daripada gambar', tone: 'sun' },
  { to: '/kad-imbas?mula=1', icon: Layers, title: 'Kad Imbas', text: 'Ulang kaji tepat masanya', tone: 'sky' },
] as const;

const TONE: Record<string, string> = {
  sky: 'bg-sky-soft text-sky-ink [--tile-edge:var(--color-sky)]',
  green: 'bg-primary-soft text-on-primary-soft [--tile-edge:var(--color-primary)]',
  rose: 'bg-rose-soft text-coral [--tile-edge:var(--color-rose)]',
  lavender: 'bg-lavender-soft text-lavender-ink [--tile-edge:var(--color-lavender)]',
  sun: 'bg-sun-soft text-sun-ink [--tile-edge:var(--color-sun)]',
};
const ICON_TONE: Record<string, string> = { sky: 'bg-sky text-on-sky', green: 'bg-primary text-on-primary', rose: 'bg-rose text-on-rose', lavender: 'bg-lavender text-on-lavender', sun: 'bg-sun text-ink' };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Selamat pagi' : h < 15 ? 'Selamat tengah hari' : h < 19 ? 'Selamat petang' : 'Selamat malam';
}

function Home() {
  useDocumentTitle('Utama');
  const state = useProgress((s) => s);
  const { state: nav } = useLocation() as { state: { justCompleted?: string } | null };
  const scope = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const today = dateKey();
  const profile = state.profile!;
  const streak = currentStreak(state.activeDays, today);
  const xpToday = state.xpByDay[today] ?? 0;
  const xpShown = useCountUp(state.xpTotal);
  const mastered = masteredIds(state).length;
  const queues = useMemo(() => buildQueues(state), [state]);
  const states = useMemo(() => nodeStates(state.lessonsDone), [state.lessonsDone]);
  const current = currentLesson(state.lessonsDone);
  const unitIndex = Math.max(0, UNITS.findIndex((u) => u.lessons.some((l) => l.id === current?.id)));
  const unit = current ? UNITS[unitIndex] : UNITS[UNITS.length - 1];
  const doneInUnit = unit.lessons.filter((l) => state.lessonsDone[l.id]).length;
  const daily = state.daily[today];
  const dailyDone = !!daily && daily.status !== 'playing';
  const dailyRecord = dailyAnswer(pool, today);
  const lessonsDone = Object.keys(state.lessonsDone).length;
  const returning = state.xpTotal > 0;

  const nextBadges = useMemo(() => ACHIEVEMENTS
    .map((a) => ({ a, got: !!state.achievements[a.id], v: Math.min(a.value(state), a.target) }))
    .sort((x, y) => Number(x.got) - Number(y.got) || y.v / y.a.target - x.v / x.a.target)
    .slice(0, 3), [state]);

  useGSAP(() => {
    if (reduced) return;
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.h-hero-copy > *', { y: 16, opacity: 0, duration: 0.45, stagger: 0.07 })
      .from('.h-hero-bayu', { y: 30, scale: 0.85, opacity: 0, duration: 0.6, ease: 'back.out(1.7)' }, 0.05)
      .from('.h-tile', { y: 18, opacity: 0, duration: 0.35, stagger: 0.05 }, 0.25);
  }, { scope, dependencies: [reduced] });

  return (
    <div ref={scope}>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0 space-y-7">
          {/* Hero */}
          <section aria-labelledby="hero" className="relative overflow-hidden rounded-[28px] bg-primary px-5 pb-5 pt-6 text-on-primary shadow-[0_6px_0_var(--color-primary-edge)] sm:px-7 sm:pt-7">
            <Sparkle className="left-[46%] top-5 size-5 text-sun" />
            <Sparkle className="left-[58%] top-16 size-3 text-surface" />
            <Sparkle className="right-6 top-6 size-4 text-surface" />
            <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <div className="h-hero-copy min-w-0 pb-1">
                <p className="text-[0.9375rem] font-[800] opacity-85">{greeting()}, {profile.name}!</p>
                <h1 id="hero" className="mt-1 text-[2rem] font-[900] leading-[1.05] tracking-[-0.02em] sm:text-[2.625rem]">{returning ? 'Selamat kembali!' : 'Selamat datang!'}</h1>
                <p className="mt-1 text-[1.125rem] font-[850] sm:text-[1.25rem]">Jom kuasai peribahasa hari ini.</p>
                <p className="mt-2 max-w-[34ch] text-[0.9375rem] font-[700] opacity-90">
                  {current ? <>Seterusnya: <strong className="font-[900]">{current.title}</strong> dalam unit {unit.title}.</> : 'Semua pelajaran selesai. Hebat! Teruskan ulang kaji.'}
                </p>
                <Link to={current ? `/pelajaran/${current.id}` : '/kad-imbas?mula=1'} className="btn btn-sun mt-5 min-h-[54px] px-6 text-[1.0625rem]">
                  Jom Belajar! <ArrowRight className="size-5" aria-hidden />
                </Link>
              </div>
              <Mascot mood={returning ? 'wave' : 'happy'} idle className="h-hero-bayu -mb-3 -mr-3 w-36 shrink-0 sm:w-48" label="Bayu, burung enggang pemandu LESTARI" />
            </div>
            <div className="relative mt-5 rounded-[16px] bg-surface p-3 text-ink">
              <div className="flex items-center justify-between text-[0.875rem] font-[850]">
                <span>Matlamat hari ini</span>
                <span className="tnum text-primary-ink">{xpToday}/{profile.dailyGoal} XP</span>
              </div>
              <ProgressBar value={xpToday} max={profile.dailyGoal} label="Kemajuan matlamat harian" className="mt-2 h-3.5" />
              <p className="mt-2 text-[0.8125rem] font-[700] text-ink-muted">
                {xpToday >= profile.dailyGoal ? 'Matlamat tercapai! Bayu bangga dengan kamu.' : '“Berdikit-dikit, lama-lama jadi bukit!”'}
              </p>
            </div>
          </section>

          {/* Learning path */}
          <section aria-labelledby="laluan">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 id="laluan" className="text-[1.375rem] font-[900]">Laluan pembelajaran</h2>
              <Link to="/laluan" className="btn btn-quiet btn-sm">Semua unit</Link>
            </div>
            <UnitBanner unit={unit} number={unitIndex + 1} done={doneInUnit} />
            <PathNodes unit={unit} states={states} highlight={nav?.justCompleted} />
            <p className="text-center text-[0.875rem] font-[700] text-ink-muted"><span className="tnum">{lessonsDone}</span> daripada <span className="tnum">{LESSONS.length}</span> pelajaran selesai</p>
          </section>
        </div>

        <aside className="min-w-0 space-y-7">
          {/* Daily challenge */}
          <section aria-labelledby="harian" className="on-night relative overflow-hidden rounded-[26px] bg-night p-5 text-on-night shadow-[0_6px_0_var(--color-night-raised)] sm:p-6">
            <Stars />
            <div className="relative flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[0.875rem] font-[850] text-on-night-muted">Cabaran harian</p>
                <h2 id="harian" className="mt-1 text-[1.5rem] font-[900] leading-tight">Peribahasa Hari Ini</h2>
                <p className="mt-1 text-[0.9375rem] font-[650] text-on-night-muted">{dailyDone ? (daily.status === 'won' ? `Jawapan: ${dailyRecord.peribahasa}` : 'Cuba lagi esok!') : 'Teka peribahasa daripada maksudnya. Empat cubaan.'}</p>
              </div>
              <Mascot mood={dailyDone ? (daily.status === 'won' ? 'cheer' : 'encourage') : 'think'} idle className="size-20 shrink-0" />
            </div>
            <span className={`relative mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.875rem] font-[900] ${dailyDone ? 'bg-mint-soft text-mint' : 'bg-sun text-ink'}`}>
              {dailyDone ? <Trophy className="size-4" aria-hidden /> : <Gift className="size-4" aria-hidden />}
              {dailyDone ? `+${daily.xp} XP diperoleh` : 'Ganjaran sehingga +30 XP'}
            </span>
            <Link to="/harian" className="btn btn-sky relative mt-4 w-full">{dailyDone ? 'Lihat jawapan' : 'Main sekarang'}</Link>
          </section>

          {/* Activities */}
          <section aria-labelledby="aktiviti">
            <h2 id="aktiviti" className="mb-3 text-[1.375rem] font-[900]">Aktiviti pantas</h2>
            <ul className="grid grid-cols-2 gap-3">
              {ACTIVITIES.map(({ to, icon: Icon, title, text, tone }) => (
                <li key={to} className="h-tile">
                  <Link to={to} className={`flex h-full min-h-[118px] flex-col rounded-[18px] border-2 border-[var(--tile-edge)] p-3.5 no-underline shadow-[0_4px_0_var(--tile-edge)] transition-transform duration-150 active:translate-y-[4px] active:shadow-none ${TONE[tone]}`}>
                    <span className={`grid size-10 place-items-center rounded-[12px] ${ICON_TONE[tone]}`}><Icon className="size-5" strokeWidth={2.6} aria-hidden /></span>
                    <span className="mt-2 text-[1rem] font-[900] leading-tight text-ink">{title}</span>
                    <span className="mt-0.5 text-[0.8125rem] font-[700]">{text}</span>
                    {to.startsWith('/kad') && queues.due.length > 0 && <span className="mt-1 text-[0.75rem] font-[900] text-coral">{queues.due.length} kad menunggu</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Progress, compact */}
          <section aria-labelledby="kemajuan" className="card border-b-4 p-4">
            <div className="flex items-center justify-between">
              <h2 id="kemajuan" className="text-[1.125rem] font-[900]">Kemajuan kamu</h2>
              <Link to="/profil" className="btn btn-quiet btn-sm -mr-2">Profil</Link>
            </div>
            <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
              {[
                { icon: <Flame className={`size-6 ${streak ? 'text-casque' : 'text-ink-subtle'}`} aria-hidden />, v: streak, l: 'streak' },
                { icon: <Sparkles className="size-6 text-sun-edge" aria-hidden />, v: xpShown, l: 'XP' },
                { icon: <Star className="size-6 text-lavender" aria-hidden />, v: mastered, l: 'dikuasai' },
                { icon: <BookOpenCheck className="size-6 text-primary" aria-hidden />, v: lessonsDone, l: 'pelajaran' },
              ].map((x) => (
                <div key={x.l} className="flex flex-col items-center rounded-[14px] bg-surface-sunk py-2.5">
                  {x.icon}
                  <dd className="tnum m-0 mt-1 text-[1.25rem] font-[900] leading-none">{x.v}</dd>
                  <dt className="mt-1 text-[0.75rem] font-[750] text-ink-muted">{x.l}</dt>
                </div>
              ))}
            </dl>
          </section>

          {/* Achievements */}
          <section aria-labelledby="lencana">
            <div className="mb-3 flex items-end justify-between">
              <h2 id="lencana" className="text-[1.375rem] font-[900]">Lencana seterusnya</h2>
              <Link to="/profil#pencapaian" className="btn btn-quiet btn-sm">Semua</Link>
            </div>
            <ul className="space-y-2.5">
              {nextBadges.map(({ a, got, v }) => (
                <li key={a.id} className="flex items-center gap-3 rounded-[16px] border-2 border-line bg-surface p-3">
                  <AchievementBadge id={a.id} unlocked={got} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <p className="font-[900]">{a.title}</p>
                    <p className="text-[0.8125rem] font-[650] text-ink-muted">{a.rule}</p>
                    {!got && <div className="mt-1.5 flex items-center gap-2"><ProgressBar value={v} max={a.target} label={`${a.title}: ${v} daripada ${a.target}`} tone="sun" className="flex-1" /><span className="tnum text-[0.75rem] font-[850] text-ink-muted">{v}/{a.target}</span></div>}
                    {got && <p className="text-[0.75rem] font-[900] text-mint">Dibuka</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Sparkle({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`pointer-events-none absolute ${className}`} aria-hidden fill="currentColor">
      <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
    </svg>
  );
}

export function Stars() {
  const pts = [[8, 18], [22, 70], [40, 30], [64, 12], [78, 56], [90, 24], [54, 80], [14, 88]];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full text-on-night" aria-hidden>
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.9 : 0.55} fill="currentColor" opacity={0.55} />)}
    </svg>
  );
}
