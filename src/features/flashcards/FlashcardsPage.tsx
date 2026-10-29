import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { RotateCw, ArrowRight, X, CalendarClock } from 'lucide-react';
import { useProgress, useStore } from '../../app/store';
import { buildQueues, sessionCards, NEW_PER_DAY } from './queue';
import { mistakeIds } from '../../lib/progress';
import { BY_ID } from '../../lib/data';
import { rate, type Rating } from '../../lib/srs';
import { relativeDue } from '../../lib/date';
import { useDocumentTitle } from '../../hooks/media';
import { PeribahasaRow, ProgressBar, EmptyState, CategoryBadge } from '../../components/ui';
import { Mascot } from '../../components/Mascot';
import type { Peribahasa } from '../../types/peribahasa';

type Tab = 'due' | 'fresh' | 'difficult' | 'mastered';

export default function FlashcardsPage() {
  useDocumentTitle('Kad Imbas');
  const [params, setParams] = useSearchParams();
  const state = useProgress((s) => s);
  const queues = useMemo(() => buildQueues(state), [state]);
  const [session, setSession] = useState<Peribahasa[] | null>(null);
  const [tab, setTab] = useState<Tab>('due');
  const startable = sessionCards(queues);
  const room = Math.max(0, NEW_PER_DAY - queues.newToday);

  useEffect(() => {
    const from = params.get('dari');
    // Saved or mistaken sayings can be drilled directly, regardless of their schedule.
    const custom = from === 'simpanan' ? state.favourites : from === 'kesilapan' ? mistakeIds(state) : null;
    const list = custom ? custom.map((id) => BY_ID.get(id)).filter((r): r is Peribahasa => !!r).slice(0, 15) : startable;
    if ((params.get('mula') === '1' || custom) && !session && list.length) {
      setSession(list);
      const next = new URLSearchParams(params);
      next.delete('mula');
      next.delete('dari');
      setParams(next, { replace: true });
    }
  }, [params, session, startable, setParams, state]);

  if (session) return <Session cards={session} onExit={() => setSession(null)} />;

  const nextDue = Object.values(state.cards).filter((c) => c.due > Date.now()).sort((a, b) => a.due - b.due)[0];
  const tabs: { id: Tab; label: string; list: Peribahasa[]; note: string }[] = [
    { id: 'due', label: 'Tiba hari ini', list: queues.due, note: 'Kad yang sudah tiba masa untuk diulang kaji.' },
    { id: 'fresh', label: 'Baharu', list: queues.fresh.slice(0, room), note: `Sehingga ${NEW_PER_DAY} kad baharu sehari, bermula dengan yang kamu simpan atau salah jawab.` },
    { id: 'difficult', label: 'Sukar', list: queues.difficult, note: 'Kad yang kamu tanda Susah atau sering terlupa.' },
    { id: 'mastered', label: 'Dikuasai', list: queues.mastered, note: 'Bertahan 7 hari atau lebih dalam ulang kaji, atau dijawab betul berulang kali termasuk dalam konteks.' },
  ];
  const active = tabs.find((t) => t.id === tab)!;

  return (
    <div>
      <h1 className="text-[1.875rem] font-[740] leading-tight tracking-[-0.03em] sm:text-[2.25rem]">Kad Imbas</h1>
      <p className="mt-1 max-w-[58ch] text-ink-muted">Ulang kaji pada masa yang sesuai. Kad yang susah kembali lebih cepat; kad yang mudah kembali selepas beberapa hari.</p>

      <section className="mt-6 flex flex-col gap-5 rounded-[var(--radius-xl)] bg-primary p-6 text-on-primary sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.875rem] font-[650] text-on-primary/80">Sesi seterusnya</p>
          <p className="mt-1 font-display text-[1.5rem] font-[740] leading-tight">
            {startable.length ? `${startable.length} kad sedia` : 'Semua sudah diulang kaji'}
          </p>
          <p className="mt-1 text-[0.9375rem] text-on-primary/85">
            {startable.length
              ? `${Math.min(queues.due.length, startable.length)} untuk diulang kaji, ${startable.length - Math.min(queues.due.length, startable.length)} kad baharu.`
              : nextDue ? `Kad seterusnya tiba ${relativeDue(nextDue.due)}.` : 'Simpan peribahasa atau main kuiz untuk menambah kad.'}
          </p>
        </div>
        <button type="button" className="btn btn-sun shrink-0" disabled={!startable.length} onClick={() => setSession(startable)}>
          Mula sesi <ArrowRight className="size-5" aria-hidden />
        </button>
      </section>

      <div role="tablist" aria-label="Barisan kad" className="scroll-row mt-8">
        {tabs.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} aria-controls="panel-kad" onClick={() => setTab(t.id)} className="chip" aria-pressed={tab === t.id}>
            {t.label} <span className="tnum rounded-full bg-surface-sunk px-1.5 text-[0.75rem]">{t.list.length}</span>
          </button>
        ))}
      </div>
      <div id="panel-kad" role="tabpanel" className="mt-4">
        <p className="mb-3 text-[0.875rem] text-ink-muted">{active.note}</p>
        {active.list.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {active.list.slice(0, 24).map((r) => {
              const c = state.cards[r.id];
              return <PeribahasaRow key={r.id} r={r} note={c ? <span className="inline-flex items-center gap-1 text-[0.78rem] font-[600] text-ink-muted"><CalendarClock className="size-3.5" aria-hidden />{relativeDue(c.due)}</span> : undefined} />;
            })}
          </div>
        ) : (
          <EmptyState art={<Mascot mood={tab === 'mastered' ? 'think' : 'happy'} className="size-20" />} title={tab === 'mastered' ? 'Belum ada peribahasa dikuasai' : tab === 'due' ? 'Tiada kad yang tiba hari ini' : tab === 'difficult' ? 'Tiada kad sukar' : 'Had kad baharu hari ini sudah dicapai'}>
            {tab === 'mastered' ? 'Ulang kaji kad yang sama pada hari-hari berlainan, atau jawab kuiz konteks dengan betul, untuk menguasainya.' : tab === 'fresh' ? 'Kembali esok untuk kad baharu.' : 'Bagus! Teruskan ulang kaji mengikut jadual.'}
          </EmptyState>
        )}
      </div>
    </div>
  );
}

const RATINGS: { r: Rating; label: string; cls: string }[] = [
  { r: 'susah', label: 'Susah', cls: 'border-coral/40 bg-coral-soft text-coral hover:border-coral' },
  { r: 'sederhana', label: 'Sederhana', cls: 'border-line-strong bg-surface text-ink hover:border-primary' },
  { r: 'mudah', label: 'Mudah', cls: 'border-mint/40 bg-mint-soft text-mint hover:border-mint' },
];

/** Label the interval the scheduler will actually set, not the time until the due moment. */
function intervalLabel(interval: number) {
  return interval === 0 ? '10 min' : `${interval} hari`;
}

function Session({ cards, onExit }: { cards: Peribahasa[]; onExit: () => void }) {
  const store = useStore();
  const cardStates = useProgress((s) => s.cards);
  const [queue, setQueue] = useState(cards);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [requeued, setRequeued] = useState<Set<string>>(new Set());
  const [tally, setTally] = useState<Record<Rating, number>>({ susah: 0, sederhana: 0, mudah: 0 });
  const r = queue[i];
  const now = Date.now();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!r) return;
      if ((e.key === ' ' || e.key === 'Enter') && !flipped && (e.target as HTMLElement).tagName !== 'BUTTON') { e.preventDefault(); setFlipped(true); }
      if (flipped && ['1', '2', '3'].includes(e.key)) onRate(RATINGS[Number(e.key) - 1].r);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function onRate(rating: Rating) {
    store.review(r.id, rating, r.peribahasa);
    setTally((t) => ({ ...t, [rating]: t[rating] + 1 }));
    // A card rated Susah comes back once more at the end of this session.
    if (rating === 'susah' && !requeued.has(r.id)) {
      setQueue((q) => [...q, r]);
      setRequeued((s) => new Set(s).add(r.id));
    }
    setFlipped(false);
    setI((x) => x + 1);
  }

  if (!r) {
    const total = tally.susah + tally.sederhana + tally.mudah;
    return (
      <div className="mx-auto flex max-w-[560px] flex-col items-center text-center">
        <Mascot mood="cheer" className="size-32" />
        <h1 className="mt-3 text-[1.75rem] font-[740]">Sesi selesai!</h1>
        <p className="mt-1 text-ink-muted">Kamu mengulang kaji {total} kad. Jadual ulang kaji sudah dikemas kini.</p>
        <dl className="mt-6 grid w-full grid-cols-3 gap-3">
          {RATINGS.map(({ r: k, label, cls }) => (
            <div key={k} className={`rounded-[var(--radius-lg)] border p-4 ${cls}`}>
              <dt className="text-[0.8125rem] font-[650]">{label}</dt>
              <dd className="tnum m-0 mt-1 font-display text-[1.75rem] font-[740] leading-none">{tally[k]}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex gap-3">
          <button type="button" className="btn btn-primary" onClick={onExit}>Selesai</button>
          <Link to="/kuiz/konteks" className="btn btn-secondary">Uji dalam konteks</Link>
        </div>
      </div>
    );
  }

  const existing = cardStates[r.id];
  const preview = Object.fromEntries(RATINGS.map(({ r: k }) => [k, intervalLabel(rate(existing, r.id, k, now).interval)])) as Record<Rating, string>;

  return (
    <div className="mx-auto max-w-[620px]">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onExit} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-surface-sunk" aria-label="Keluar dari sesi"><X className="size-5" aria-hidden /></button>
        <ProgressBar value={i} max={queue.length} label="Kemajuan sesi kad imbas" tone="violet" className="flex-1" />
        <span className="tnum shrink-0 text-[0.875rem] font-[700] text-ink-muted">{i + 1}/{queue.length}</span>
      </div>
      <p className="mt-4 text-center text-[0.8125rem] font-[600] text-ink-muted">{existing ? 'Ulang kaji' : 'Kad baharu'}</p>

      <div className="flip mt-3">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? 'Tunjuk peribahasa' : 'Terbalikkan kad untuk melihat maksud'}
          className="block w-full text-left"
        >
          <div className="flip-inner grid min-h-[340px]" data-flipped={flipped}>
            <div className="flip-face col-start-1 row-start-1 flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-line bg-surface p-8 text-center shadow-[var(--shadow-lift)]" aria-hidden={flipped}>
              <CategoryBadge r={r} />
              <p className="saying mt-5 text-[1.875rem] leading-tight sm:text-[2.25rem]">{r.peribahasa}</p>
              <p className="mt-8 inline-flex items-center gap-2 text-[0.875rem] font-[650] text-ink-subtle"><RotateCw className="size-4" aria-hidden />Ketik untuk lihat maksud</p>
            </div>
            <div className="flip-face flip-back col-start-1 row-start-1 flex flex-col justify-center rounded-[var(--radius-xl)] border border-line bg-surface-sunk p-6 shadow-[var(--shadow-lift)] sm:p-8" aria-hidden={!flipped}>
              <p className="saying text-[1.125rem] text-ink-muted">{r.peribahasa}</p>
              <p className="mt-3 text-[1.25rem] font-[650] leading-snug">{r.maksud}</p>
              {r.contohAyat[0] && <p className="mt-4 border-t border-line-strong/60 pt-4 text-[0.9375rem] leading-relaxed">“{r.contohAyat[0].text}”</p>}
              {r.usageTip && <p className="mt-3 text-[0.875rem] text-ink-muted">Tip: {r.usageTip}</p>}
              <div className="mt-4"><CategoryBadge r={r} /></div>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-6" aria-live="polite">
        {flipped ? (
          <div>
            <p className="mb-2 text-center text-[0.875rem] font-[650] text-ink-muted">Sejauh mana kamu ingat?</p>
            <div className="grid grid-cols-3 gap-2.5">
              {RATINGS.map(({ r: k, label, cls }, idx) => (
                <button key={k} type="button" onClick={() => onRate(k)} className={`flex min-h-16 flex-col items-center justify-center rounded-[14px] border-2 font-[750] transition-[border-color,transform] duration-150 active:scale-[0.98] ${cls}`}>
                  {label}
                  <span className="text-[0.75rem] font-[600] opacity-80">{preview[k]}</span>
                  <span className="sr-only">, kekunci {idx + 1}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setFlipped(true)} className="btn btn-primary w-full">Tunjuk maksud</button>
        )}
      </div>
    </div>
  );
}
