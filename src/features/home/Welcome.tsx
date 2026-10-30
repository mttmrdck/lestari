import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowRight, Compass, BookOpenText, Puzzle, Layers, PenLine } from 'lucide-react';
import { Mascot, Wordmark } from '../../components/Mascot';
import { Highlight } from '../../components/ui';
import { RECORDS, THEMES } from '../../lib/data';
import { buildIndex, situationSearch } from '../../lib/search';
import { EMOJI_PUZZLES } from '../../content/emoji';
import { useDocumentTitle, useReducedMotion } from '../../hooks/media';
import { Onboarding } from './Onboarding';

const SAMPLE = 'Ali baru mula belajar apabila peperiksaan tinggal seminggu.';

const JOURNEY = [
  { icon: Compass, title: 'Terokai', text: 'Cari mengikut kata kunci atau ceritakan situasi kamu.' },
  { icon: BookOpenText, title: 'Fahami', text: 'Baca maksud, bila sesuai digunakan dan contoh ayat.' },
  { icon: Puzzle, title: 'Latih', text: 'Kuiz emoji, isi tempat kosong dan pilih ikut konteks.' },
  { icon: Layers, title: 'Ingat', text: 'Kad imbas mengulang peribahasa tepat sebelum kamu lupa.' },
  { icon: PenLine, title: 'Guna', text: 'Gunakan peribahasa yang betul dalam karangan dan perbualan.' },
];

export function Welcome() {
  useDocumentTitle('');
  const [onboarding, setOnboarding] = useState(false);
  const scope = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // The hero preview is a live result from the real situation engine, not a mock.
  const match = useMemo(() => situationSearch(buildIndex(RECORDS), SAMPLE).results[0], []);
  const stats = useMemo(() => ({
    total: RECORDS.length,
    prpm: RECORDS.filter((r) => r.verificationStatus === 'disahkan-prpm').length,
    themes: Object.keys(THEMES).length,
    puzzles: EMOJI_PUZZLES.length,
  }), []);

  useGSAP(() => {
    if (reduced) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.w-line', { y: 28, opacity: 0, duration: 0.6, stagger: 0.09 })
      .from('.w-copy', { y: 12, opacity: 0, duration: 0.5 }, '-=0.3')
      .from('.w-actions > *', { y: 10, opacity: 0, duration: 0.4, stagger: 0.06 }, '-=0.3')
      .from('.w-scene', { scale: 0.96, opacity: 0, duration: 0.7 }, 0.1)
      .from('.bayu-head', { rotate: -8, duration: 0.8, ease: 'elastic.out(1, 0.5)' }, 0.5)
      .from('.w-bridge', { y: 18, opacity: 0, duration: 0.55 }, 0.75)
      .from('.w-mark', { scaleX: 0, transformOrigin: 'left center', duration: 0.35, stagger: 0.12 }, 1.1);
    // A gentle, finite wave from Bayu once the scene has settled.
    gsap.to('.bayu-wing', { rotate: -14, duration: 0.28, yoyo: true, repeat: 3, ease: 'sine.inOut', delay: 1.4 });
  }, { scope, dependencies: [reduced] });

  return (
    <div ref={scope} className="min-h-dvh bg-paper">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-4 pt-[calc(16px+env(safe-area-inset-top))] sm:px-8">
        <Wordmark />
        <div className="flex items-center gap-1">
          <Link to="/cari" className="btn btn-quiet hidden sm:inline-flex">Terus ke carian</Link>
          <Link to="/masuk" className="btn btn-secondary btn-sm">Log Masuk</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1180px] gap-10 px-4 pb-14 pt-8 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-x-12 lg:gap-y-8 lg:pb-20 lg:pt-10">
        <h1 className="font-display text-[2.6rem] font-[760] leading-[1.02] tracking-[-0.035em] sm:text-[3.5rem] lg:col-span-2 lg:text-[5rem] xl:text-[6rem]">
          <span className="w-line block lg:whitespace-nowrap">Fahami Makna.</span>
          <span className="w-line block lg:whitespace-nowrap">Kuasai Bahasa.</span>
          <span className="w-line block text-primary-ink lg:whitespace-nowrap">Hidupkan Peribahasa.</span>
        </h1>
        <div className="-mt-4 lg:mt-0">
          <p className="w-copy max-w-[44ch] text-[1.0625rem] leading-relaxed text-ink-muted lg:text-[1.1875rem]">
            Ceritakan situasi kamu, dan LESTARI mencari peribahasa yang sesuai serta menerangkan sebabnya. Kemudian latih dan ingat dengan kuiz dan kad imbas.
          </p>
          <div className="w-actions mt-7 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary min-h-[52px] px-6 text-[1rem]" onClick={() => setOnboarding(true)}>
              Mula Belajar <ArrowRight className="size-5" aria-hidden />
            </button>
            <Link to="/cari" className="btn btn-secondary min-h-[52px] px-6 text-[1rem]">Terokai Peribahasa</Link>
          </div>
        </div>

        {/* Scene: Bayu and a live match bridge */}
        <div className="w-scene relative">
          <div className="relative overflow-hidden rounded-[32px] bg-night px-5 pb-5 pt-6 text-on-night sm:px-7 sm:pt-8">
            <svg viewBox="0 0 400 160" className="pointer-events-none absolute inset-x-0 bottom-0 w-full" aria-hidden>
              <path d="M0 110c60-30 110-34 160-14s110 22 150-6 70-30 90-24v94H0z" fill="#221E42" />
              <path d="M0 136c70-22 130-20 190-4s120 14 210-14v42H0z" fill="#2B2652" />
            </svg>
            <div className="relative flex items-end gap-3">
              <Mascot mood="read" className="w-[44%] max-w-[210px] shrink-0 drop-shadow-[0_10px_18px_var(--color-mascot-shadow)]" label="Bayu, burung enggang pemandu LESTARI, sedang membaca" />
              <p className="mb-6 rounded-[18px] rounded-bl-[4px] bg-night-raised px-4 py-3 text-[0.9375rem] leading-snug text-on-night">
                Hai! Saya <strong className="text-sun">Bayu</strong>. Ceritakan apa yang berlaku, saya carikan peribahasanya.
              </p>
            </div>
            {match && (
              <div className="w-bridge relative mt-2 rounded-[22px] bg-surface p-4 text-ink shadow-[var(--shadow-lift)] sm:p-5">
                <p className="text-[0.8125rem] font-[650] text-ink-muted">Situasi</p>
                <p className="mt-1 text-[0.98rem] leading-relaxed">
                  <Highlight text={SAMPLE} terms={match.matched} />
                </p>
                <div className="my-3 flex items-center gap-2 text-ink-subtle" aria-hidden>
                  <span className="w-mark h-px flex-1 bg-line-strong" />
                  <ArrowRight className="size-4 rotate-90" />
                  <span className="w-mark h-px flex-1 bg-line-strong" />
                </div>
                <p className="saying text-[1.375rem] leading-tight">{match.record.peribahasa}</p>
                <p className="mt-1.5 text-[0.9rem] text-ink-muted">{match.record.maksud}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="cara" className="border-t border-line bg-surface/70">
        <div className="mx-auto max-w-[1180px] px-4 py-14 sm:px-8">
          <h2 id="cara" className="max-w-[24ch] text-[1.75rem] font-[740] leading-tight tracking-[-0.025em] sm:text-[2.125rem]">Dari terokai hingga guna, satu peribahasa demi satu.</h2>
          <ol className="relative mt-10 grid gap-8 sm:grid-cols-5 sm:gap-4">
            <span className="absolute left-[19px] top-2 hidden h-[calc(100%-16px)] w-0.5 bg-line sm:left-0 sm:top-[19px] sm:block sm:h-0.5 sm:w-full" aria-hidden />
            {JOURNEY.map(({ icon: Icon, title, text }) => (
              <li key={title} className="relative flex gap-4 sm:flex-col sm:gap-3">
                <span className="relative grid size-10 shrink-0 place-items-center rounded-full border-2 border-primary bg-surface text-primary-ink">
                  <Icon className="size-5" strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <h3 className="text-[1.0625rem] font-[700]">{title}</h3>
                  <p className="mt-1 text-[0.9rem] text-ink-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="koleksi" className="mx-auto max-w-[1180px] px-4 py-14 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <h2 id="koleksi" className="text-[1.75rem] font-[740] leading-tight tracking-[-0.025em]">Koleksi yang jelas sumbernya.</h2>
            <p className="mt-3 max-w-[52ch] text-ink-muted">
              Setiap peribahasa menyimpan asal sumbernya. Peribahasa tambahan disemak dengan PRPM, Dewan Bahasa dan Pustaka, dan contoh ayat yang ditulis oleh pasukan LESTARI dilabel dengan jelas.
            </p>
            <Link to="/tentang" className="btn btn-quiet mt-3 -ml-3">Tentang data <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 rounded-[var(--radius-xl)] border border-line bg-surface p-6 sm:grid-cols-4">
            {[
              [stats.total, 'peribahasa'],
              [stats.prpm, 'disemak dengan PRPM'],
              [stats.themes, 'tema pembelajaran'],
              [stats.puzzles, 'teka-teki emoji'],
            ].map(([n, l]) => (
              <div key={String(l)} className="flex flex-col">
                <dt className="text-[0.8125rem] font-[600] text-ink-muted">{l}</dt>
                <dd className="tnum order-first m-0 font-display text-[2rem] font-[740] leading-none">{n}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-12 flex flex-col items-start gap-4 rounded-[var(--radius-xl)] bg-primary-soft p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-[1.25rem] font-[700] text-on-primary-soft">Sedia? Satu soalan pun sudah satu langkah.</p>
          <button type="button" className="btn btn-primary" onClick={() => setOnboarding(true)}>Mula Belajar <ArrowRight className="size-5" aria-hidden /></button>
        </div>
      </section>

      <footer className="border-t border-line px-4 py-8 text-center text-[0.8125rem] text-ink-subtle">
        LESTARI. Tanpa akaun, kemajuan disimpan dalam pelayar ini sahaja. <Link to="/daftar" className="font-[700] text-primary-ink">Daftar</Link> untuk simpan kemajuan dan masuk Papan Juara.
      </footer>

      <Onboarding open={onboarding} onClose={() => setOnboarding(false)} />
    </div>
  );
}
