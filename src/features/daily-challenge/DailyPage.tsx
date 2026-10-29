import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Lightbulb, Send, CheckCircle2, XCircle, CalendarDays, ArrowRight } from 'lucide-react';
import { useProgress, useStore } from '../../app/store';
import { BY_ID, CORE, RECORDS } from '../../lib/data';
import { dailyAnswer, dailyPool, isCorrectGuess, cluesFor, DAILY_ATTEMPTS } from '../../lib/daily';
import { dateKey, formatDateMs } from '../../lib/date';
import { normalize } from '../../lib/text';
import { useDocumentTitle, useReducedMotion } from '../../hooks/media';
import { Mascot } from '../../components/Mascot';
import { fireConfetti } from '../../components/Celebrate';
import { Stars } from '../home/HomeRoute';
import { CategoryBadge } from '../../components/ui';

const POOL = dailyPool(CORE);

export default function DailyPage() {
  useDocumentTitle('Peribahasa Hari Ini');
  const store = useStore();
  const today = dateKey();
  const answer = dailyAnswer(POOL, today);
  const state = useProgress((s) => s.daily[today]);
  const history = useProgress((s) => s.daily);
  const [guess, setGuess] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const scope = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const guesses = state?.guesses ?? [];
  const status = state?.status ?? 'playing';
  const wrong = status === 'won' ? guesses.length - 1 : guesses.length;
  const clues = cluesFor(answer, status === 'playing' ? wrong : 3);
  const left = DAILY_ATTEMPTS - guesses.length;

  const suggestions = useMemo(() => {
    const q = normalize(guess);
    if (q.length < 3) return [];
    return RECORDS.filter((r) => r.normalizedText.includes(q)).slice(0, 5);
  }, [guess]);

  useGSAP(() => {
    if (reduced || status !== 'won') return;
    gsap.timeline()
      .from('.d-reveal', { y: 16, opacity: 0, duration: 0.5, ease: 'power3.out' })
      .from('.d-mascot', { y: 20, rotate: -6, opacity: 0, duration: 0.6, ease: 'back.out(2)' }, '-=0.3')
      .from('.d-dot', { scale: 0, duration: 0.3, stagger: 0.06, ease: 'back.out(3)' }, '-=0.3');
  }, { scope, dependencies: [status, reduced] });

  function submit(e?: FormEvent, value = guess) {
    e?.preventDefault();
    const g = value.trim();
    if (!g || status !== 'playing') return;
    if (guesses.some((x) => normalize(x) === normalize(g))) { setHint('Kamu sudah mencuba jawapan ini.'); return; }
    if (g.split(/\s+/).length < 2) { setHint('Taip peribahasa penuh, bukan satu perkataan.'); return; }
    setHint(null);
    const ok = isCorrectGuess(answer, g, BY_ID);
    store.dailyGuess(today, answer.id, g, ok, DAILY_ATTEMPTS);
    if (ok) fireConfetti();
    setGuess('');
  }

  const past = Object.entries(history).filter(([d, v]) => d !== today && v.status !== 'playing').sort((a, b) => b[0].localeCompare(a[0])).slice(0, 10);

  return (
    <div ref={scope} className="mx-auto max-w-[760px]">
      <p className="flex items-center gap-2 text-[0.875rem] font-[650] text-ink-muted"><CalendarDays className="size-4" aria-hidden />{formatDateMs(today, true)}</p>
      <h1 className="mt-1 text-[1.875rem] font-[740] leading-tight tracking-[-0.03em] sm:text-[2.25rem]">Peribahasa Hari Ini</h1>
      <p className="mt-1 text-ink-muted">Teka peribahasa daripada petunjuk. Setiap jawapan salah membuka petunjuk baharu. Semua pelajar mendapat peribahasa yang sama hari ini.</p>

      <section className="on-night relative mt-6 overflow-hidden rounded-[var(--radius-xl)] bg-night p-5 text-on-night shadow-[0_6px_0_var(--color-night-raised)] sm:p-7">
        <Stars />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.875rem] font-[650] text-on-night-muted">Petunjuk</p>
          <div className="flex gap-1.5" aria-label={`${guesses.length} daripada ${DAILY_ATTEMPTS} cubaan digunakan`}>
            {Array.from({ length: DAILY_ATTEMPTS }).map((_, i) => {
              const used = i < guesses.length;
              const win = status === 'won' && i === guesses.length - 1;
              return <span key={i} className={`d-dot size-3 rounded-full ${win ? 'bg-mint-bright' : used ? 'bg-coral' : 'bg-night-raised ring-1 ring-on-night-muted/30'}`} />;
            })}
          </div>
        </div>
        <ol className="mt-4 space-y-3">
          {clues.map((c, i) => (
            <li key={c.label} className={`rounded-[16px] bg-night-raised p-4 ${i === clues.length - 1 && status === 'playing' && i > 0 ? 'rise-in' : ''}`}>
              <p className="flex items-center gap-2 text-[0.8125rem] font-[650] text-sun"><Lightbulb className="size-4" aria-hidden />{i + 1}. {c.label}</p>
              <p className={`mt-1 ${c.label === 'Bentuk' || c.label === 'Perkataan pertama' ? 'saying text-[1.25rem]' : 'text-[1.0625rem]'} leading-relaxed`}>{c.value}</p>
            </li>
          ))}
          {status === 'playing' && clues.length < 4 && (
            <li className="rounded-[16px] border border-dashed border-on-night-muted/30 p-4 text-[0.875rem] text-on-night-muted">Petunjuk seterusnya dibuka selepas jawapan yang salah.</li>
          )}
        </ol>

        {status === 'playing' ? (
          <form onSubmit={submit} className="mt-5">
            <label htmlFor="teka" className="text-[0.875rem] font-[650]">Jawapan kamu <span className="font-[500] text-on-night-muted">({left} cubaan lagi)</span></label>
            <div className="mt-2 flex gap-2">
              <input id="teka" value={guess} onChange={(e) => setGuess(e.target.value)} autoComplete="off" className="field min-w-0 flex-1 border-night-raised bg-night-raised text-on-night placeholder:text-on-night-muted focus:border-sun focus:shadow-none" placeholder="Taip peribahasa…" aria-describedby="teka-nota" />
              <button type="submit" className="btn btn-sun shrink-0" disabled={!guess.trim()} aria-label="Hantar jawapan"><Send className="size-5" aria-hidden /><span className="hidden sm:inline">Teka</span></button>
            </div>
            <p id="teka-nota" className="mt-2 text-[0.8125rem] text-on-night-muted">Salah ejaan kecil masih diterima.</p>
            {hint && <p role="alert" className="mt-2 text-[0.875rem] font-[600] text-sun">{hint}</p>}
            {suggestions.length > 0 && (
              <ul className="mt-3 space-y-1.5" aria-label="Cadangan daripada koleksi">
                {suggestions.map((r) => (
                  <li key={r.id}><button type="button" onClick={() => submit(undefined, r.peribahasa)} className="saying w-full rounded-[12px] bg-night-raised px-3.5 py-2.5 text-left text-[1rem] hover:ring-1 hover:ring-sun">{r.peribahasa}</button></li>
                ))}
              </ul>
            )}
          </form>
        ) : (
          <div className="d-reveal mt-6 rounded-[18px] bg-surface p-5 text-ink" role="status">
            <p className={`flex items-center gap-2 font-[750] ${status === 'won' ? 'text-mint' : 'text-coral'}`}>
              {status === 'won' ? <CheckCircle2 className="size-5" aria-hidden /> : <XCircle className="size-5" aria-hidden />}
              {status === 'won' ? `Tepat! Kamu meneka dalam ${guesses.length} cubaan.` : 'Cubaan sudah habis. Inilah jawapannya.'}
              {state && state.xp > 0 && <span className="ml-auto rounded-full bg-sun px-2.5 py-0.5 text-[0.8125rem] text-ink">+{state.xp} XP</span>}
            </p>
            <div className="mt-3 flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <CategoryBadge r={answer} />
                <p className="saying mt-2 text-[1.625rem] leading-tight">{answer.peribahasa}</p>
                <p className="mt-1.5 text-ink-muted">{answer.maksud}</p>
              </div>
              <Mascot mood={status === 'won' ? 'cheer' : 'think'} className="d-mascot size-20 shrink-0" />
            </div>
            {answer.contohAyat[0] && <p className="mt-3 border-t border-line pt-3 text-[0.9375rem]">“{answer.contohAyat[0].text}”</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to={`/peribahasa/${answer.id}`} className="btn btn-primary btn-sm">Pelajari peribahasa ini <ArrowRight className="size-4" aria-hidden /></Link>
              <Link to="/kuiz/konteks" className="btn btn-secondary btn-sm">Latih dalam konteks</Link>
            </div>
            <p className="mt-3 text-[0.8125rem] text-ink-muted">Cabaran baharu muncul esok.</p>
          </div>
        )}

        {guesses.length > 0 && (
          <div className="mt-5">
            <p className="text-[0.8125rem] font-[650] text-on-night-muted">Cubaan kamu</p>
            <ol className="mt-2 space-y-1.5">
              {guesses.map((g, i) => {
                const ok = status === 'won' && i === guesses.length - 1;
                return <li key={i} className={`flex items-center gap-2 text-[0.9375rem] ${ok ? 'text-mint-bright' : 'text-on-night-muted line-through decoration-coral/70'}`}>{ok ? <CheckCircle2 className="size-4 shrink-0" aria-hidden /> : <XCircle className="size-4 shrink-0 text-coral" aria-hidden />}<span className="saying">{g}</span></li>;
              })}
            </ol>
          </div>
        )}
      </section>

      <section aria-labelledby="lepas" className="mt-10">
        <h2 id="lepas" className="text-[1.25rem] font-[700]">Cabaran lepas</h2>
        {past.length ? (
          <ul className="mt-3 divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
            {past.map(([d, v]) => {
              const r = BY_ID.get(v.answerId);
              return (
                <li key={d}>
                  <Link to={r ? `/peribahasa/${r.id}` : '#'} className="flex items-center justify-between gap-3 px-4 py-3 no-underline hover:bg-surface-sunk">
                    <span className="min-w-0"><span className="block text-[0.8125rem] text-ink-muted">{formatDateMs(d)}</span><span className="saying block truncate text-[1.0625rem]">{r?.peribahasa ?? 'Peribahasa tidak lagi wujud'}</span></span>
                    <span className={`shrink-0 text-[0.8125rem] font-[700] ${v.status === 'won' ? 'text-mint' : 'text-ink-muted'}`}>{v.status === 'won' ? `${v.guesses.length}/${DAILY_ATTEMPTS}` : 'Tidak berjaya'}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-ink-muted">Jawapan cabaran yang sudah selesai akan disimpan di sini untuk dirujuk semula.</p>
        )}
      </section>
    </div>
  );
}
