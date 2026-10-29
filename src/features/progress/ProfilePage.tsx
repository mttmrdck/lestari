import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Trophy, Lock, Pencil, Trash2, Bookmark, ArrowRight } from 'lucide-react';
import { useProgress, useStore } from '../../app/store';
import { ACHIEVEMENTS, currentStreak, longestStreak, masteredIds, quizAccuracy, isMastered } from '../../lib/progress';
import { addDays, dateKey } from '../../lib/date';
import { RECORDS, BY_ID } from '../../lib/data';
import { KATEGORI } from '../../types/peribahasa';
import { useDocumentTitle } from '../../hooks/media';
import { PeribahasaRow, ProgressBar, SectionTitle, EmptyState, Sheet } from '../../components/ui';
import { Mascot } from '../../components/Mascot';
import { Onboarding } from '../home/Onboarding';

const DAY_SHORT = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];

export default function ProfilePage() {
  useDocumentTitle('Profil');
  const store = useStore();
  const s = useProgress((x) => x);
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const today = dateKey();
  const mastered = masteredIds(s);
  const accuracy = quizAccuracy(s);
  const explored = Object.keys(s.explored).length;

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6);
    const [y, m, d] = key.split('-').map(Number);
    return { key, xp: s.xpByDay[key] ?? 0, label: DAY_SHORT[new Date(y, m - 1, d).getDay()], today: key === today };
  }), [s.xpByDay, today]);

  const byCategory = useMemo(() => KATEGORI.map((k) => {
    const ids = RECORDS.filter((r) => r.category === k).map((r) => r.id);
    return { k, total: ids.length, explored: ids.filter((id) => s.explored[id]).length, mastered: ids.filter((id) => isMastered(s, id)).length };
  }), [s]);

  const favourites = s.favourites.map((id) => BY_ID.get(id)).filter((r): r is NonNullable<typeof r> => !!r);
  const name = s.profile?.name ?? 'Pelajar';

  return (
    <div className="space-y-2">
      <header className="flex flex-wrap items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-[1.75rem] font-[760] text-on-primary-soft" aria-hidden>{name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.875rem] font-[740] leading-tight tracking-[-0.03em]">{name}</h1>
          <p className="text-ink-muted">{s.profile ? `${s.profile.level === 'rendah' ? 'Sekolah rendah' : 'Sekolah menengah'}, matlamat ${s.profile.dailyGoal} XP sehari` : 'Profil belum dibuat'}</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}><Pencil className="size-4" aria-hidden />{s.profile ? 'Ubah profil' : 'Buat profil'}</button>
      </header>
      <p className="pt-1 text-[0.8125rem] text-ink-subtle">Kemajuan disimpan dalam pelayar ini sahaja dan tidak diselaraskan ke peranti lain.</p>

      <SectionTitle>Kemajuan</SectionTitle>
      <dl className="card grid grid-cols-2 gap-x-6 gap-y-6 p-5 sm:grid-cols-3 sm:p-6 lg:grid-cols-6">
        {[
          [currentStreak(s.activeDays, today), 'Streak semasa', `Terpanjang ${longestStreak(s.activeDays)} hari`],
          [s.xpTotal, 'Jumlah XP', null],
          [explored, 'Diterokai', `daripada ${RECORDS.length}`],
          [mastered.length, 'Dikuasai', 'dengan bukti ulang kaji atau kuiz'],
          [accuracy === null ? '–' : `${Math.round(accuracy * 100)}%`, 'Ketepatan kuiz', accuracy === null ? 'belum ada jawapan' : null],
          [s.counters.reviews, 'Kad diulang kaji', null],
        ].map(([v, l, h]) => (
          <div key={String(l)} className="flex min-w-0 flex-col">
            <dt className="text-[0.8125rem] font-[650] text-ink-muted">{l}</dt>
            <dd className="tnum order-first m-0 font-display text-[1.75rem] font-[720] leading-none">{v}</dd>
            {h && <dd className="m-0 mt-0.5 text-[0.75rem] text-ink-subtle">{h}</dd>}
          </div>
        ))}
      </dl>

      <div className="grid gap-x-8 lg:grid-cols-2">
        <section aria-labelledby="xp7">
          <SectionTitle id="xp7">XP 7 hari lalu</SectionTitle>
          <WeekChart week={week} goal={s.profile?.dailyGoal ?? 50} />
        </section>
        <section aria-labelledby="kat">
          <SectionTitle id="kat">Mengikut kategori</SectionTitle>
          <ul className="card space-y-4 p-5">
            {byCategory.map((c) => (
              <li key={c.k}>
                <div className="flex items-baseline justify-between gap-3 text-[0.9rem]">
                  <span className="font-[650]">{c.k}</span>
                  <span className="tnum text-ink-muted">{c.mastered} dikuasai, {c.explored} diterokai daripada {c.total}</span>
                </div>
                <div className="relative mt-1.5">
                  <ProgressBar value={c.explored} max={c.total} label={`${c.k}: diterokai`} tone="violet" className="opacity-30" />
                  <ProgressBar value={c.mastered} max={c.total} label={`${c.k}: dikuasai`} className="absolute inset-0 !bg-transparent" />
                </div>
              </li>
            ))}
            <li className="flex gap-4 pt-1 text-[0.75rem] text-ink-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-mint-bright" />Dikuasai</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-primary/30" />Diterokai</span>
            </li>
          </ul>
        </section>
      </div>

      <SectionTitle>Pencapaian</SectionTitle>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACHIEVEMENTS.map((a) => {
          const got = !!s.achievements[a.id];
          const v = Math.min(a.value(s), a.target);
          return (
            <li key={a.id} className={`rounded-[var(--radius-lg)] border p-4 ${got ? 'border-sun bg-sun-soft' : 'border-line bg-surface'}`}>
              <div className="flex items-center gap-2">
                <span className={`grid size-9 place-items-center rounded-full ${got ? 'bg-sun text-ink' : 'bg-surface-sunk text-ink-subtle'}`}>{got ? <Trophy className="size-4.5" aria-hidden /> : <Lock className="size-4" aria-hidden />}</span>
                <p className="font-[720]">{a.title}</p>
              </div>
              <p className={`mt-2 text-[0.8125rem] ${got ? 'text-sun-ink' : 'text-ink-muted'}`}>{a.rule}</p>
              {!got && (
                <div className="mt-3 flex items-center gap-2">
                  <ProgressBar value={v} max={a.target} label={`${a.title}: ${v} daripada ${a.target}`} tone="sun" className="flex-1" />
                  <span className="tnum text-[0.75rem] font-[650] text-ink-muted">{v}/{a.target}</span>
                </div>
              )}
              {got && <p className="mt-2 text-[0.75rem] font-[650] text-sun-ink">Dibuka</p>}
            </li>
          );
        })}
      </ul>

      <SectionTitle id="kegemaran">Kegemaran</SectionTitle>
      {favourites.length ? (
        <div className="grid gap-3 md:grid-cols-2">{favourites.map((r) => <PeribahasaRow key={r.id} r={r} trailing={<Bookmark className="mt-1 size-5 shrink-0 fill-primary text-primary" aria-hidden />} />)}</div>
      ) : (
        <EmptyState art={<Mascot mood="read" className="size-20" />} title="Belum ada peribahasa disimpan" action={<Link to="/cari" className="btn btn-secondary btn-sm">Cari peribahasa</Link>}>Tekan “Simpan” pada mana-mana peribahasa. Peribahasa yang disimpan muncul dahulu dalam kad imbas.</EmptyState>
      )}

      <SectionTitle>Aktiviti terkini</SectionTitle>
      {s.activity.length ? (
        <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
          {s.activity.slice(0, 8).map((a, i) => (
            <li key={`${a.t}-${i}`} className="flex justify-between gap-3 px-4 py-3 text-[0.9rem]">
              <span>{a.text}</span>
              <time className="tnum shrink-0 text-ink-subtle" dateTime={new Date(a.t).toISOString()}>{new Date(a.t).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}</time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">Belum ada aktiviti. <Link to="/kuiz" className="font-[650] text-primary">Mulakan kuiz pertama <ArrowRight className="inline size-4" aria-hidden /></Link></p>
      )}

      <SectionTitle>Tetapan dan data</SectionTitle>
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-[650]">Tentang koleksi peribahasa</p>
          <p className="text-[0.875rem] text-ink-muted">Sumber, cara pengesahan dan had data.</p>
        </div>
        <Link to="/tentang" className="btn btn-secondary btn-sm">Tentang data</Link>
      </div>
      <div className="card mt-3 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-[650]">Padam semua kemajuan</p>
          <p className="text-[0.875rem] text-ink-muted">XP, streak, kad imbas dan kegemaran dalam pelayar ini akan dipadam.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm text-coral" onClick={() => setConfirmReset(true)}><Trash2 className="size-4" aria-hidden />Padam data</button>
      </div>

      <Onboarding open={editing} onClose={() => setEditing(false)} />
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Padam semua kemajuan?">
        <p className="text-ink-muted">Tindakan ini tidak boleh dibatalkan. Semua XP, streak, jadual kad imbas dan kegemaran akan hilang dari pelayar ini.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmReset(false)}>Batal</button>
          <button type="button" className="btn btn-primary bg-coral hover:!bg-coral" onClick={() => { store.reset(); setConfirmReset(false); }}>Ya, padam</button>
        </div>
      </Sheet>
    </div>
  );
}

function WeekChart({ week, goal }: { week: { key: string; xp: number; label: string; today: boolean }[]; goal: number }) {
  const max = Math.max(goal, ...week.map((d) => d.xp));
  const total = week.reduce((n, d) => n + d.xp, 0);
  return (
    <figure className="card m-0 p-5">
      <figcaption className="text-[0.875rem] text-ink-muted"><span className="tnum font-[700] text-ink">{total} XP</span> dalam 7 hari. Garis putus ialah matlamat harian ({goal} XP).</figcaption>
      <div className="relative mt-4 h-40">
        <div className="absolute inset-x-0 border-t border-dashed border-line-strong" style={{ bottom: `${(goal / max) * 100}%` }} aria-hidden />
        <ol className="absolute inset-0 grid grid-cols-7 items-end gap-[6px] border-b border-line" aria-hidden>
          {week.map((d) => (
            <li key={d.key} className="group relative flex h-full items-end justify-center">
              <span className={`w-full max-w-9 rounded-t-[4px] ${d.today ? 'bg-primary' : 'bg-primary/55'}`} style={{ height: d.xp ? `${Math.max(3, (d.xp / max) * 100)}%` : '2px', opacity: d.xp ? 1 : 0.35 }} />
              <span className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[0.75rem] font-[650] text-on-night group-hover:block">{d.xp} XP</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-[6px] text-center text-[0.75rem] font-[600] text-ink-muted" aria-hidden>
        {week.map((d) => <span key={d.key} className={d.today ? 'text-ink' : ''}>{d.today ? 'Hari ini' : d.label}</span>)}
      </div>
      <table className="sr-only">
        <caption>XP setiap hari, 7 hari lalu</caption>
        <tbody>{week.map((d) => <tr key={d.key}><th scope="row">{d.key}</th><td>{d.xp} XP</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
