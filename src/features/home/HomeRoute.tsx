import { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Search, Smile, TextCursorInput, MessagesSquare, Flame, CalendarCheck, Bookmark, RotateCcw } from 'lucide-react';
import { useProgress } from '../../app/store';
import { Welcome } from './Welcome';
import { Mascot } from '../../components/Mascot';
import { PeribahasaRow, ProgressBar, SectionTitle, EmptyState, CategoryBadge } from '../../components/ui';
import { CORE } from '../../lib/data';
import { currentStreak, masteredIds } from '../../lib/progress';
import { dateKey, formatDateMs } from '../../lib/date';
import { dailyAnswer, dailyPool } from '../../lib/daily';
import { hashString } from '../../lib/random';
import { buildQueues } from '../flashcards/queue';
import { useDocumentTitle } from '../../hooks/media';

export function HomeRoute() {
  const hasProfile = useProgress((s) => !!s.profile);
  return hasProfile ? <Home /> : <Welcome />;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Selamat pagi' : h < 15 ? 'Selamat tengah hari' : h < 19 ? 'Selamat petang' : 'Selamat malam';
}

const pool = dailyPool(CORE);

function Home() {
  useDocumentTitle('Utama');
  const state = useProgress((s) => s);
  const today = dateKey();
  const profile = state.profile!;
  const streak = currentStreak(state.activeDays, today);
  const xpToday = state.xpByDay[today] ?? 0;
  const mastered = masteredIds(state).length;
  const queues = useMemo(() => buildQueues(state), [state]);
  const daily = state.daily[today];
  const dailyRecord = dailyAnswer(pool, today);
  // Recommendation: a different saying from the daily puzzle, stable for the day.
  const pick = useMemo(() => {
    const candidates = CORE.filter((r) => r.id !== dailyRecord.id && r.contohAyat.length > 0);
    return candidates[hashString(`pilihan:${today}`) % candidates.length];
  }, [today, dailyRecord.id]);
  const fresh = state.xpTotal === 0 && Object.keys(state.cards).length === 0;

  const next = queues.due.length
    ? { title: `Ulang kaji ${queues.due.length} kad yang sudah tiba masanya`, text: 'Ulang kaji sekarang supaya peribahasa ini kekal dalam ingatan.', to: '/kad-imbas?mula=1', cta: 'Mula ulang kaji' }
    : !daily || daily.status === 'playing'
      ? { title: 'Teka Peribahasa Hari Ini', text: 'Tiga petunjuk, empat cubaan. Cabaran baharu setiap hari.', to: '/harian', cta: 'Cuba sekarang' }
      : !state.quizHistory.some((q) => q.date === today)
        ? { title: 'Uji pemahaman konteks', text: 'Baca situasi sebenar dan pilih peribahasa yang paling sesuai.', to: '/kuiz/konteks', cta: 'Mula kuiz' }
        : { title: 'Kenali peribahasa baharu', text: `${Math.min(queues.fresh.length, 10)} kad baharu sedia untuk dipelajari.`, to: '/kad-imbas?mula=1', cta: 'Buka kad imbas' };

  const revision = [...new Set([...queues.due, ...queues.difficult, ...state.revisionList.map((id) => CORE.find((r) => r.id === id)).filter(Boolean)])].slice(0, 3) as typeof CORE;

  return (
    <div className="space-y-8 lg:space-y-10">
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.875rem] font-[600] text-ink-muted">{formatDateMs(today, true)}</p>
          <h1 className="mt-1 text-[1.875rem] font-[740] leading-tight tracking-[-0.03em] sm:text-[2.25rem]">{greeting()}, {profile.name}.</h1>
        </div>
        <Mascot mood={fresh ? 'happy' : xpToday >= profile.dailyGoal ? 'cheer' : 'read'} className="hidden size-20 shrink-0 sm:block" />
      </header>

      {/* Today's numbers: type, not tiles */}
      <section aria-label="Ringkasan hari ini" className="card grid grid-cols-2 gap-y-5 p-5 sm:grid-cols-4 sm:divide-x sm:divide-line sm:p-6">
        <div className="sm:pr-5">
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-[650] text-ink-muted"><Flame className="size-4 text-casque" aria-hidden />Streak</p>
          <p className="tnum mt-1 font-display text-[1.75rem] font-[720] leading-none">{streak}<span className="ml-1 text-[0.9375rem] font-[600] text-ink-muted">hari</span></p>
        </div>
        <div className="sm:px-5">
          <p className="text-[0.8125rem] font-[650] text-ink-muted">Matlamat hari ini</p>
          <p className="tnum mt-1 font-display text-[1.75rem] font-[720] leading-none">{xpToday}<span className="text-[0.9375rem] font-[600] text-ink-muted"> / {profile.dailyGoal} XP</span></p>
          <ProgressBar value={xpToday} max={profile.dailyGoal} label="Kemajuan matlamat harian" className="mt-2.5" />
        </div>
        <div className="sm:px-5">
          <p className="text-[0.8125rem] font-[650] text-ink-muted">Jumlah XP</p>
          <p className="tnum mt-1 font-display text-[1.75rem] font-[720] leading-none">{state.xpTotal}</p>
        </div>
        <div className="sm:pl-5">
          <p className="text-[0.8125rem] font-[650] text-ink-muted">Dikuasai</p>
          <p className="tnum mt-1 font-display text-[1.75rem] font-[720] leading-none">{mastered}<span className="ml-1 text-[0.9375rem] font-[600] text-ink-muted">peribahasa</span></p>
        </div>
        {fresh && <p className="col-span-2 text-[0.875rem] text-ink-muted sm:col-span-4 sm:pt-1">Semua bermula dari sifar. Jawab satu soalan atau ulang kaji satu kad untuk memulakan streak kamu.</p>}
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0 space-y-8">
          {/* Sambung Belajar */}
          <section aria-labelledby="sambung" className="relative overflow-hidden rounded-[var(--radius-xl)] bg-primary p-6 text-on-primary sm:p-7">
            <p className="text-[0.875rem] font-[650] text-on-primary/80">Sambung Belajar</p>
            <h2 id="sambung" className="mt-1 max-w-[22ch] text-[1.5rem] font-[740] leading-tight tracking-[-0.02em]">{next.title}</h2>
            <p className="mt-2 max-w-[40ch] text-[0.9375rem] text-on-primary/85">{next.text}</p>
            <Link to={next.to} className="btn btn-sun mt-5">{next.cta} <ArrowRight className="size-5" aria-hidden /></Link>
            <Mascot mood="happy" className="pointer-events-none absolute -bottom-6 -right-4 w-32 opacity-95 sm:w-40" />
          </section>

          {/* Peribahasa pilihan hari ini */}
          <section aria-labelledby="pilihan">
            <SectionTitle id="pilihan">Peribahasa pilihan hari ini</SectionTitle>
            <Link to={`/peribahasa/${pick.id}`} className="card card-link block p-5 no-underline sm:p-6">
              <CategoryBadge r={pick} />
              <p className="saying mt-3 text-[1.625rem] leading-tight">{pick.peribahasa}</p>
              <p className="mt-2 text-ink-muted">{pick.maksud}</p>
              {pick.contohAyat[0] && <p className="mt-4 border-t border-line pt-4 text-[0.9375rem] text-ink">“{pick.contohAyat[0].text}”</p>}
              <span className="mt-4 inline-flex items-center gap-1 text-[0.9375rem] font-[680] text-primary">Pelajari peribahasa ini <ArrowRight className="size-4" aria-hidden /></span>
            </Link>
          </section>

          {/* Revision */}
          <section aria-labelledby="ulangkaji">
            <SectionTitle id="ulangkaji" action={<Link to="/kad-imbas" className="btn btn-quiet btn-sm">Semua kad</Link>}>Untuk diulang kaji</SectionTitle>
            {revision.length ? (
              <div className="space-y-3">
                {revision.map((r) => <PeribahasaRow key={r.id} r={r} trailing={<RotateCcw className="mt-1 size-5 shrink-0 text-primary" aria-hidden />} />)}
              </div>
            ) : (
              <EmptyState art={<Mascot mood="think" className="size-20" />} title="Belum ada kad untuk diulang kaji" action={<Link to="/kad-imbas?mula=1" className="btn btn-secondary btn-sm">Mulakan kad baharu</Link>}>
                Kad yang kamu tanda susah atau yang tiba masa ulang kaji akan muncul di sini.
              </EmptyState>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-8">
          {/* Daily challenge */}
          <section aria-labelledby="harian" className="on-night rounded-[var(--radius-xl)] bg-night p-6 text-on-night">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[0.875rem] font-[650] text-on-night-muted"><CalendarCheck className="size-4 text-mint-bright" aria-hidden />Peribahasa Hari Ini</p>
              <span className={`rounded-full px-2.5 py-0.5 text-[0.75rem] font-[700] ${daily?.status === 'won' ? 'bg-mint-bright/20 text-mint-bright' : daily?.status === 'lost' ? 'bg-on-night/10 text-on-night-muted' : 'bg-sun/20 text-sun'}`}>
                {daily?.status === 'won' ? 'Selesai' : daily?.status === 'lost' ? 'Cuba esok' : 'Belum dicuba'}
              </span>
            </div>
            <h2 id="harian" className="mt-3 text-[1.375rem] font-[720] leading-tight">
              {daily && daily.status !== 'playing' ? dailyRecord.peribahasa : 'Teka peribahasa daripada maksudnya'}
            </h2>
            <div className="mt-4 flex gap-1.5" aria-label={`${daily?.guesses.length ?? 0} daripada 4 cubaan digunakan`}>
              {Array.from({ length: 4 }).map((_, i) => {
                const used = i < (daily?.guesses.length ?? 0);
                const winning = daily?.status === 'won' && i === daily.guesses.length - 1;
                return <span key={i} className={`h-2 flex-1 rounded-full ${winning ? 'bg-mint-bright' : used ? 'bg-on-night-muted/60' : 'bg-night-raised'}`} />;
              })}
            </div>
            <Link to="/harian" className="btn btn-sun mt-5 w-full">{daily && daily.status !== 'playing' ? 'Lihat jawapan' : 'Main sekarang'}</Link>
          </section>

          {/* Quick access */}
          <section aria-labelledby="pantas">
            <SectionTitle id="pantas">Akses pantas</SectionTitle>
            <Link to="/cari" className="field flex items-center gap-3 text-ink-subtle no-underline">
              <Search className="size-5" aria-hidden /> Cari peribahasa atau situasi…
            </Link>
            <ul className="mt-3 space-y-2">
              {[
                { to: '/kuiz/emoji', icon: Smile, label: 'Teka Emoji' },
                { to: '/kuiz/kosong', icon: TextCursorInput, label: 'Isi Tempat Kosong' },
                { to: '/kuiz/konteks', icon: MessagesSquare, label: 'Pilih Peribahasa yang Sesuai' },
              ].map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <Link to={to} className="card card-link flex min-h-14 items-center gap-3 px-4 no-underline">
                    <Icon className="size-5 text-primary" strokeWidth={2} aria-hidden />
                    <span className="flex-1 font-[650]">{label}</span>
                    <ArrowRight className="size-4 text-ink-subtle" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            {state.favourites.length > 0 && (
              <Link to="/profil#kegemaran" className="btn btn-quiet mt-3 -ml-3"><Bookmark className="size-4" aria-hidden />{state.favourites.length} peribahasa disimpan</Link>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
