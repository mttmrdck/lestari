import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ChevronDown, ChevronUp, Crown, Info, LogIn, Medal, Minus, RotateCw, Sparkles, UsersRound } from 'lucide-react';
import { useAuth } from '../../app/auth';
import { api, type LeaderboardResponse, type LeaderEntry } from '../../lib/api';
import { Segmented } from '../../components/ui';
import { Mascot } from '../../components/Mascot';
import { fireConfetti, useCountUp } from '../../components/Celebrate';
import { useDocumentTitle, useReducedMotion } from '../../hooks/media';
import { Avatar } from './Avatar';

type Tempoh = 'minggu' | 'bulan' | 'semua';
const TEMPOH: { value: Tempoh; label: string }[] = [
  { value: 'minggu', label: 'Minggu Ini' },
  { value: 'bulan', label: 'Bulan Ini' },
  { value: 'semua', label: 'Keseluruhan' },
];
const EMPTY_TEXT: Record<Tempoh, string> = {
  minggu: 'Belum ada XP minggu ini. Jawab satu soalan dan jadilah yang pertama!',
  bulan: 'Belum ada XP bulan ini. Jawab satu soalan dan jadilah yang pertama!',
  semua: 'Belum ada sesiapa di papan ini. Jadilah yang pertama!',
};

const rankKey = (t: Tempoh) => `lestari:kedudukan:${t}`;

export default function LeaderboardPage() {
  useDocumentTitle('Papan Juara');
  const { user, status } = useAuth();
  const [tempoh, setTempoh] = useState<Tempoh>('minggu');
  const [demo, setDemo] = useState<'auto' | '0' | '1'>('auto');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [climb, setClimb] = useState<number | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const res = await api.leaderboard(tempoh, demo);
      if (id !== reqId.current) return;
      setData(res);
      setFailed(false);
    } catch {
      if (id === reqId.current) setFailed(true);
    }
  }, [tempoh, demo]);

  useEffect(() => { if (status !== 'loading') void load(); }, [load, status]);
  // New XP from this device moves the board without a refresh.
  useEffect(() => {
    const onSync = () => void load();
    window.addEventListener('lestari:xp-selaras', onSync);
    return () => window.removeEventListener('lestari:xp-selaras', onSync);
  }, [load]);

  // Celebrates a real climb since this learner last looked at this period's board.
  const you = data?.you ?? null;
  useEffect(() => {
    if (!you || data?.period !== tempoh) return;
    const key = rankKey(tempoh);
    let last: number | null = null;
    try { last = Number(localStorage.getItem(key)) || null; } catch { /* no memory, no banner */ }
    if (last && you.rank < last) {
      setClimb(last - you.rank);
      if (you.rank <= 3 && last > 3) fireConfetti();
    } else setClimb(null);
    try { localStorage.setItem(key, String(you.rank)); } catch { /* ignore */ }
  }, [you, tempoh, data?.period]);

  const entries = data?.entries ?? [];
  const showYouBar = !!you;

  return (
    <div className={showYouBar ? 'pb-20' : ''}>
      <header className="relative overflow-hidden rounded-[26px] bg-lavender-soft px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[2.125rem] font-[900] leading-[1.05] tracking-[-0.02em] sm:text-[2.625rem]">Papan Juara</h1>
            <p className="mt-1 font-[700] text-lavender-ink">Siapa paling konsisten menguasai peribahasa?</p>
          </div>
          <Mascot mood="cheer" idle className="size-20 shrink-0 sm:size-28" />
        </div>
      </header>

      <div className="mt-4 max-w-[520px]">
        <Segmented label="Tempoh kedudukan" value={tempoh} onChange={setTempoh} options={TEMPOH} />
      </div>

      {climb && (
        <p role="status" className="pop mt-4 flex items-center gap-2 rounded-[var(--radius-md)] bg-sun-soft px-4 py-3 font-[800] text-sun-ink">
          <Sparkles className="size-5 shrink-0" aria-hidden />Hebat! Kamu naik {climb} tangga sejak kali terakhir.
        </p>
      )}

      {data?.demoIncluded && (
        <div className="mt-4 flex flex-col gap-2 rounded-[var(--radius-md)] border-2 border-dashed border-line-strong bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between" data-testid="notis-demo">
          <p className="flex items-start gap-2 text-[0.9rem] font-[700] text-ink-muted"><UsersRound className="mt-0.5 size-5 shrink-0" aria-hidden />Profil bertanda “Demo” ialah watak rekaan untuk menunjukkan papan ini, bukan pelajar sebenar.</p>
          <button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={() => setDemo('0')}>Sembunyikan demo</button>
        </div>
      )}
      {demo === '0' && data && !data.demoIncluded && data.realPlayers < 3 && (
        <button type="button" className="btn btn-quiet btn-sm mt-2" onClick={() => setDemo('1')}>Tunjuk profil demo</button>
      )}

      {failed && !data ? (
        <div className="mt-6 rounded-[var(--radius-lg)] border-2 border-line-strong bg-surface p-6 text-center">
          <Mascot mood="encourage" className="mx-auto size-20" />
          <p className="mt-2 font-[800]">Papan Juara tidak dapat dimuatkan.</p>
          <p className="text-[0.9375rem] text-ink-muted">Semak sambungan internet dan cuba lagi.</p>
          <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={() => void load()}><RotateCw className="size-4" aria-hidden />Cuba lagi</button>
        </div>
      ) : !data ? (
        <div aria-busy="true" aria-label="Memuatkan" className="mt-6 animate-pulse space-y-3">
          <div className="h-56 rounded-[var(--radius-xl)] bg-surface-sunk" />
          {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-[var(--radius-lg)] bg-surface-sunk" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius-lg)] border-2 border-line bg-surface p-6 text-center" data-testid="papan-kosong">
          <Mascot mood="wave" idle className="mx-auto size-24" />
          <p className="mt-2 text-[1.125rem] font-[900]">Pentas masih kosong!</p>
          <p className="text-ink-muted">{EMPTY_TEXT[tempoh]}</p>
          <Link to="/kuiz" className="btn btn-primary mt-4">Jom Berlatih</Link>
        </div>
      ) : (
        <Board key={`${tempoh}`} entries={entries} tempoh={tempoh} />
      )}

      {data && !user && status !== 'loading' && (
        <div className="mt-5 flex flex-col gap-3 rounded-[var(--radius-lg)] bg-sky-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-[750] text-sky-ink">Log masuk untuk masuk papan ini. XP dikira selepas kamu log masuk.</p>
          <Link to="/masuk?ke=/papan-juara" className="btn btn-sky btn-sm shrink-0"><LogIn className="size-4" aria-hidden />Log Masuk</Link>
        </div>
      )}
      {data && user && !you && (
        <p className="mt-5 rounded-[var(--radius-lg)] bg-sky-soft p-4 font-[750] text-sky-ink">Kamu belum ada XP dalam tempoh ini. <Link to="/kuiz" className="font-[900]">Jawab satu soalan</Link> untuk masuk papan.</p>
      )}

      <p className="mt-5 flex items-start gap-2 text-[0.8125rem] text-ink-subtle">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Kedudukan dikira oleh pelayan daripada jawapan betul, pelajaran, ulang kaji dan cabaran harian, dengan had 300 XP sehari. Jika XP sama, yang mencapainya dahulu berada di atas. Anak panah menunjukkan perubahan berbanding semalam. Masa mengikut waktu Malaysia.
      </p>

      {you && <YouBar you={you} />}
    </div>
  );
}

function Board({ entries, tempoh }: { entries: LeaderEntry[]; tempoh: Tempoh }) {
  const top = entries.slice(0, 3);
  const rest = entries.slice(3);
  const scope = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const positions = useRef(new Map<string, number>());
  const reduced = useReducedMotion();

  useGSAP(() => {
    if (reduced) return;
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.p-col', { scaleY: 0, transformOrigin: 'bottom center', duration: 0.5, stagger: { each: 0.12, from: 'end' }, ease: 'back.out(1.5)' })
      .from('.p-avatar', { scale: 0, duration: 0.4, stagger: 0.1, ease: 'back.out(2.4)' }, 0.25)
      .from('.p-crown', { y: -28, opacity: 0, rotate: -24, duration: 0.5, ease: 'bounce.out' }, 0.7)
      .from('.p-meta', { opacity: 0, y: 8, duration: 0.3, stagger: 0.06 }, 0.55)
      .from('.r-row', { opacity: 0, y: 14, duration: 0.3, stagger: 0.035 }, 0.5);
  }, { scope, dependencies: [reduced] });

  // FLIP: when a refresh reorders rows, each one slides from where it was.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const next = new Map<string, number>();
    for (const el of list.querySelectorAll<HTMLElement>('[data-key]')) {
      const key = el.dataset.key!;
      next.set(key, el.offsetTop);
      const was = positions.current.get(key);
      if (!reduced && was !== undefined && was !== el.offsetTop) gsap.fromTo(el, { y: was - el.offsetTop }, { y: 0, duration: 0.45, ease: 'power3.out' });
    }
    positions.current = next;
  }, [entries, reduced]);

  return (
    <div ref={scope} className="mt-6">
      <Podium top={top} tempoh={tempoh} />
      {rest.length > 0 && (
        <ol ref={listRef} className="mt-4 space-y-2.5" aria-label="Kedudukan seterusnya">
          {rest.map((e) => <Row key={e.key} e={e} />)}
        </ol>
      )}
    </div>
  );
}

const PODIUM = {
  1: { h: 'h-36 sm:h-44', fill: 'bg-sun', edge: 'shadow-[0_6px_0_var(--color-sun-edge)]', ring: 'border-sun', size: 'lg', label: 'Tempat pertama' },
  2: { h: 'h-24 sm:h-32', fill: 'bg-medal-silver', edge: 'shadow-[0_6px_0_var(--color-medal-silver-edge)]', ring: 'border-medal-silver', size: 'md', label: 'Tempat kedua' },
  3: { h: 'h-16 sm:h-24', fill: 'bg-medal-bronze', edge: 'shadow-[0_6px_0_var(--color-medal-bronze-edge)]', ring: 'border-medal-bronze', size: 'md', label: 'Tempat ketiga' },
} as const;

function Podium({ top, tempoh }: { top: LeaderEntry[]; tempoh: Tempoh }) {
  // Second on the left, first in the centre, third on the right.
  const order = [top[1], top[0], top[2]];
  return (
    <ol className="grid grid-cols-3 items-end gap-2 overflow-hidden rounded-[var(--radius-xl)] bg-night px-3 pt-6 sm:gap-4 sm:px-8 sm:pt-8" aria-label="Tiga teratas">
      {order.map((e, i) => (e ? <Step key={e.key} e={e} tempoh={tempoh} /> : <li key={`kosong-${i}`} aria-hidden />))}
    </ol>
  );
}

function Step({ e, tempoh }: { e: LeaderEntry; tempoh: Tempoh }) {
  const p = PODIUM[e.rank as 1 | 2 | 3];
  const xp = useCountUp(e.xp, 1000, 0);
  return (
    <li className="on-night flex min-w-0 flex-col items-center text-center" data-tempoh={tempoh} data-testid={`podium-${e.rank}`}>
      <span className="sr-only">{p.label}: {e.name}, {e.xp} XP{e.demo ? ', profil demo' : ''}</span>
      <div aria-hidden className="flex w-full min-w-0 flex-col items-center">
        {e.rank === 1 && <Crown className="p-crown -mb-1 size-8 text-sun" fill="currentColor" strokeWidth={2} />}
        <span className="p-avatar relative">
          <Avatar name={e.name} seed={e.key} size={p.size} ring={p.ring} />
          {e.you && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-sky px-1.5 text-[0.6875rem] font-[900] text-on-sky">Kamu</span>}
        </span>
        <p className="p-meta mt-2 w-full truncate text-[0.875rem] font-[850] text-on-night sm:text-[1rem]">{e.name}</p>
        <p className="p-meta tnum text-[0.8125rem] font-[800] text-on-night-muted"><span data-testid="xp">{xp}</span> XP</p>
        {e.demo && <span className="p-meta mt-0.5 rounded-full border border-on-night-muted px-1.5 text-[0.6875rem] font-[800] text-on-night-muted">Demo</span>}
        <span className={`p-col mt-2 grid w-full place-items-start justify-center rounded-t-[14px] pt-2 ${p.h} ${p.fill} ${p.edge}`}>
          <span className="tnum font-display text-[1.75rem] font-[900] leading-none text-ink sm:text-[2.25rem]">{e.rank}</span>
        </span>
      </div>
    </li>
  );
}

function Move({ move }: { move: number | null }) {
  if (move === null) return <span className="rounded-full bg-sky-soft px-1.5 py-0.5 text-[0.6875rem] font-[900] text-sky-ink">Baru</span>;
  if (move > 0) return <span className="tnum inline-flex items-center text-[0.8125rem] font-[900] text-primary-ink"><ChevronUp className="size-4" strokeWidth={3} aria-hidden />{move}<span className="sr-only"> naik</span></span>;
  if (move < 0) return <span className="tnum inline-flex items-center text-[0.8125rem] font-[900] text-coral"><ChevronDown className="size-4" strokeWidth={3} aria-hidden />{-move}<span className="sr-only"> turun</span></span>;
  return <Minus className="size-4 text-ink-subtle" aria-label="Tiada perubahan" />;
}

function Row({ e }: { e: LeaderEntry }) {
  const xp = useCountUp(e.xp, 800, 0);
  return (
    <li data-key={e.key} data-you={e.you || undefined} className={`r-row flex items-center gap-3 rounded-[var(--radius-lg)] border-2 p-2.5 sm:px-4 ${e.you ? 'row-you border-sky bg-sky-soft' : 'border-line bg-surface'}`}>
      <span className="tnum w-7 shrink-0 text-center text-[1.0625rem] font-[900] text-ink-muted">{e.rank}</span>
      <Avatar name={e.name} seed={e.key} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-[850]">{e.name}</p>
        <p className="flex items-center gap-1.5 text-[0.8125rem] text-ink-subtle">
          {e.you && <span className="shrink-0 rounded-full bg-sky px-1.5 text-[0.6875rem] font-[900] text-on-sky">Kamu</span>}
          {e.demo && <span className="shrink-0 rounded-full border border-line-strong px-1.5 text-[0.6875rem] font-[800] text-ink-muted">Demo</span>}
          {e.username && <span className="truncate">@{e.username}</span>}
        </p>
      </div>
      <span className="grid w-9 shrink-0 place-items-center"><Move move={e.move} /></span>
      <span className="tnum w-[4.5rem] shrink-0 text-right font-[900]">{xp} <span className="text-[0.75rem] font-[800] text-ink-muted">XP</span></span>
    </li>
  );
}

/**
 * Always on screen for a ranked learner, so finding yourself never needs scrolling. Portalled to the
 * body because the page-entrance animation's transform would otherwise anchor `fixed` to the page.
 */
function YouBar({ you }: { you: LeaderEntry }) {
  return createPortal(
    <aside aria-label="Kedudukan Kamu" data-testid="kedudukan-kamu" className="fixed inset-x-0 bottom-[calc(69px+env(safe-area-inset-bottom))] z-30 px-4 lg:bottom-4 lg:left-[248px]">
      <div className="mx-auto flex max-w-[760px] items-center gap-3 rounded-[var(--radius-lg)] border-2 border-sky bg-sky-soft p-2.5 shadow-[var(--shadow-lift)] sm:px-4">
        <Medal className="size-6 shrink-0 text-sky-ink" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[0.75rem] font-[800] text-sky-ink">Kedudukan Kamu</p>
          <p className="truncate font-[900]"><span className="tnum">#{you.rank}</span> {you.name}</p>
        </div>
        <span className="grid w-9 shrink-0 place-items-center"><Move move={you.move} /></span>
        <span className="tnum shrink-0 font-[900]">{you.xp} XP</span>
      </div>
    </aside>,
    document.body,
  );
}
