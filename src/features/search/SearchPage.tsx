import { useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Search, X, Mic, MicOff, Sparkles, ArrowRight, Info, MessageSquareQuote, KeyRound } from 'lucide-react';
import { RECORDS, BY_ID, THEMES, THEME_COUNTS, CATEGORY_INFO } from '../../lib/data';
import { buildIndex, keywordSearch, situationSearch, frequentImageWords, POPULAR_KEYWORDS, type SituationResult } from '../../lib/search';
import { KATEGORI, type Kategori, type ThemeId } from '../../types/peribahasa';
import { PeribahasaRow, Segmented, Highlight, EmptyState, CategoryBadge } from '../../components/ui';
import { Mascot } from '../../components/Mascot';
import { useStore } from '../../app/store';
import { useDocumentTitle, useVoiceInput } from '../../hooks/media';
import { normalize, tokenize, levenshtein } from '../../lib/text';

const INDEX = buildIndex(RECORDS);
const EXTRA_CHIPS = frequentImageWords(RECORDS, POPULAR_KEYWORDS, 10);
const VOCAB = (() => {
  const counts = new Map<string, number>();
  for (const r of RECORDS) for (const t of tokenize(r.peribahasa)) if (t.length >= 3) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w);
})();

const EXAMPLES = [
  'Ali baru mula belajar apabila peperiksaan tinggal seminggu.',
  'Semua ahli kelas bergotong-royong membersihkan kelas bersama-sama.',
  'Walaupun gagal dua kali, dia terus mencuba dan tidak berputus asa.',
];

type Mode = 'kata' | 'situasi';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const mode = (params.get('mode') === 'situasi' ? 'situasi' : 'kata') as Mode;
  useDocumentTitle(mode === 'situasi' ? 'Carian Situasi' : 'Cari Peribahasa');

  const setMode = (m: Mode) => {
    const next = new URLSearchParams(params);
    next.set('mode', m);
    next.delete('q');
    setParams(next, { replace: true });
  };

  return (
    <div>
      <h1 className="text-[1.875rem] font-[740] leading-tight tracking-[-0.03em] sm:text-[2.25rem]">Cari peribahasa</h1>
      <p className="mt-1 text-ink-muted">Cari dengan kata kunci, atau ceritakan situasi dan dapatkan peribahasa yang sesuai.</p>
      <div className="mt-5 max-w-[520px]">
        <Segmented
          label="Mod carian"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'kata', label: 'Kata Kunci', icon: <KeyRound className="size-4" aria-hidden /> },
            { value: 'situasi', label: 'Situasi', icon: <MessageSquareQuote className="size-4" aria-hidden /> },
          ]}
        />
      </div>
      <div className="mt-6">{mode === 'kata' ? <KeywordMode /> : <SituationMode />}</div>
    </div>
  );
}

// ---------- Mode A ----------

function KeywordMode() {
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') ?? '';
  const [text, setText] = useState(urlQ);
  const category = (params.get('kategori') as Kategori | null) || null;
  const theme = (params.get('tema') as ThemeId | null) || null;
  const deferred = useDeferredValue(text);
  const [limit, setLimit] = useState(30);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(urlQ); }, [urlQ]);
  // Keep the URL in step with typing (replace, so Back is not flooded).
  useEffect(() => {
    const t = window.setTimeout(() => {
      if ((params.get('q') ?? '') === text) return;
      const next = new URLSearchParams(params);
      if (text) next.set('q', text); else next.delete('q');
      setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(t);
  }, [text, params, setParams]);
  useEffect(() => setLimit(30), [deferred, category, theme]);

  const setFilter = (key: 'kategori' | 'tema', value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const results = useMemo(() => keywordSearch(INDEX, deferred, { category, theme }), [deferred, category, theme]);
  const groups = {
    peribahasa: results.filter((r) => r.where === 'peribahasa'),
    maksud: results.filter((r) => r.where === 'maksud'),
    tema: results.filter((r) => r.where === 'tema'),
  };
  const q = normalize(deferred);
  const wordSuggestions = q.length >= 2 ? VOCAB.filter((w) => w.startsWith(q.split(' ').pop()!) && w !== q).slice(0, 6) : [];
  const nearMisses = q.length >= 3 && !results.length ? VOCAB.filter((w) => Math.abs(w.length - q.length) <= 2 && levenshtein(w, q) <= 2).slice(0, 5) : [];
  const browsing = !q && !category && !theme;

  const runChip = (word: string) => { setText(word); inputRef.current?.focus(); };
  const voice = useVoiceInput((t) => setText(t.replace(/[.?!]+$/, '')));
  let shown = 0;

  return (
    <div>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative max-w-[720px]">
        <label htmlFor="kata" className="sr-only">Kata kunci peribahasa</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-subtle" aria-hidden />
        <input
          ref={inputRef}
          id="kata"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          className="field min-h-14 pl-12 pr-24 text-[1.0625rem]"
          placeholder="Cuba “padi”, “harimau” atau “ilmu”"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {text && (
            <button type="button" onClick={() => { setText(''); inputRef.current?.focus(); }} className="grid size-10 place-items-center rounded-full text-ink-muted hover:bg-surface-sunk" aria-label="Kosongkan carian">
              <X className="size-5" aria-hidden />
            </button>
          )}
          {voice.supported && (
            <button type="button" onClick={voice.listening ? voice.stop : voice.start} aria-pressed={voice.listening} className={`grid size-10 place-items-center rounded-full ${voice.listening ? 'bg-coral text-surface' : 'text-ink-muted hover:bg-surface-sunk'}`} aria-label={voice.listening ? 'Henti input suara' : 'Cari dengan suara'}>
              {voice.listening ? <MicOff className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
            </button>
          )}
        </div>
      </form>

      {voice.error && <p className="mt-2 text-[0.875rem] font-[700] text-coral" role="alert">{voice.error}</p>}
      {wordSuggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Cadangan perkataan">
          <span className="text-[0.8125rem] font-[600] text-ink-muted">Cadangan:</span>
          {wordSuggestions.map((w) => <button key={w} type="button" className="chip" onClick={() => runChip(w)}>{w}</button>)}
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-[0.8125rem] font-[650] text-ink-muted" id="popular">Kata kunci popular</p>
        <div className="scroll-row" aria-labelledby="popular">
          {[...POPULAR_KEYWORDS, ...EXTRA_CHIPS.map((w) => w.charAt(0).toUpperCase() + w.slice(1))].map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={normalize(k) === q} onClick={() => runChip(k)}>{k}</button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="scroll-row min-w-0 flex-1" role="group" aria-label="Tapis mengikut kategori">
          <button type="button" className="chip" aria-pressed={!category} onClick={() => setFilter('kategori', null)}>Semua kategori</button>
          {KATEGORI.map((k) => <button key={k} type="button" className="chip" aria-pressed={category === k} onClick={() => setFilter('kategori', category === k ? null : k)}>{k}</button>)}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-[0.875rem] font-[600]">
          <span className="text-ink-muted">Tema</span>
          <select value={theme ?? ''} onChange={(e) => setFilter('tema', e.target.value || null)} className="field min-h-10 w-auto py-1.5 pr-8 text-[0.875rem]">
            <option value="">Semua tema</option>
            {(Object.keys(THEMES) as ThemeId[]).map((t) => <option key={t} value={t}>{THEMES[t].label}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-6" aria-live="polite">
        {browsing ? (
          <ThemeBrowser onTheme={(t) => setFilter('tema', t)} />
        ) : results.length === 0 ? (
          <EmptyState art={<Mascot mood="think" className="size-20" />} title={q ? `Tiada peribahasa ditemui untuk “${deferred.trim()}”` : 'Tiada peribahasa dalam tapisan ini'}>
            <p>{nearMisses.length ? 'Mungkin maksud kamu:' : 'Cuba kata yang lebih umum, buang tapisan, atau ceritakan situasi dalam mod Situasi.'}</p>
            {nearMisses.length > 0 && <div className="mt-3 flex flex-wrap justify-center gap-2">{nearMisses.map((w) => <button key={w} type="button" className="chip" onClick={() => runChip(w)}>{w}</button>)}</div>}
            {(category || theme) && <button type="button" className="btn btn-quiet mt-3" onClick={() => { const n = new URLSearchParams(params); n.delete('kategori'); n.delete('tema'); setParams(n, { replace: true }); }}>Buang tapisan</button>}
          </EmptyState>
        ) : (
          <div className="space-y-8">
            <p className="text-[0.9375rem] font-[600] text-ink-muted">{results.length} peribahasa ditemui</p>
            {([['peribahasa', 'Dalam peribahasa'], ['maksud', 'Dalam maksud'], ['tema', theme ? 'Dalam tema' : 'Berkaitan tema']] as const).map(([key, title]) => {
              const list = groups[key];
              if (!list.length) return null;
              return (
                <section key={key} aria-label={`${title}: ${list.length}`}>
                  <h2 className="mb-3 text-[1.0625rem] font-[700]">{title} <span className="tnum font-[600] text-ink-muted">({list.length})</span></h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {list.map((x) => {
                      if (shown >= limit) return null;
                      shown++;
                      return <PeribahasaRow key={x.record.id} r={x.record} terms={x.terms} />;
                    })}
                  </div>
                </section>
              );
            })}
            {results.length > limit && <button type="button" className="btn btn-secondary w-full sm:w-auto" onClick={() => setLimit((l) => l + 30)}>Tunjuk lagi ({results.length - limit})</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function ThemeBrowser({ onTheme }: { onTheme: (t: ThemeId) => void }) {
  return (
    <div className="space-y-8">
      <section aria-labelledby="tema-h">
        <h2 id="tema-h" className="mb-3 text-[1.25rem] font-[700]">Terokai mengikut tema</h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(THEMES) as ThemeId[]).map((t) => (
            <button key={t} type="button" onClick={() => onTheme(t)} className="card card-link flex items-center justify-between gap-3 px-4 py-3.5 text-left">
              <span className="min-w-0">
                <span className="block font-[680]">{THEMES[t].label}</span>
                <span className="block text-[0.8125rem] text-ink-muted">{THEMES[t].blurb}</span>
              </span>
              <span className="tnum shrink-0 rounded-full bg-surface-sunk px-2.5 py-0.5 text-[0.8125rem] font-[700] text-ink-muted">{THEME_COUNTS[t] ?? 0}</span>
            </button>
          ))}
        </div>
      </section>
      <section aria-labelledby="kat-h">
        <h2 id="kat-h" className="mb-3 text-[1.25rem] font-[700]">Jenis peribahasa</h2>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {KATEGORI.map((k) => (
            <div key={k} className="border-l-0 border-t border-line pt-3">
              <dt className="font-[700]">{k} <span className="tnum font-[600] text-ink-muted">({RECORDS.filter((r) => r.category === k).length})</span></dt>
              <dd className="m-0 mt-0.5 text-[0.9rem] text-ink-muted">{CATEGORY_INFO[k].blurb}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 flex items-start gap-2 text-[0.8125rem] text-ink-subtle"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />Sumber asal tidak menyatakan kategori, jadi kebanyakan kategori dianggarkan oleh peraturan bahasa dan ditanda “anggaran”.</p>
      </section>
    </div>
  );
}

// ---------- Mode B ----------

function SituationMode() {
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') ?? '';
  const [text, setText] = useState(urlQ);
  const store = useStore();
  const voice = useVoiceInput((t) => setText((prev) => (prev ? `${prev} ${t}` : t)));
  const response = useMemo(() => (urlQ ? situationSearch(INDEX, urlQ, { byId: BY_ID }) : null), [urlQ]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const tooShort = urlQ && normalize(urlQ).split(' ').length < 2;

  useEffect(() => {
    if (response && response.results.length && !response.weak) store.logSituationSearch(urlQ);
  }, [response, urlQ, store]);

  function submit(e?: FormEvent, value = text) {
    e?.preventDefault();
    const next = new URLSearchParams(params);
    next.set('mode', 'situasi');
    if (value.trim()) next.set('q', value.trim()); else next.delete('q');
    setParams(next);
    window.setTimeout(() => resultsRef.current?.focus(), 50);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start">
      <form onSubmit={submit} className="lg:sticky lg:top-8">
        <label htmlFor="situasi" className="font-[700]">Ceritakan situasi</label>
        <p className="mt-0.5 text-[0.875rem] text-ink-muted">Tulis apa yang berlaku dalam satu atau dua ayat.</p>
        <div className="relative mt-2">
          <textarea
            id="situasi"
            rows={4}
            className="field min-h-[132px] resize-y pb-12 text-[1.0625rem] leading-relaxed"
            placeholder="Contoh: Ali baru mula belajar apabila peperiksaan tinggal seminggu."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          />
          {voice.supported && (
            <button
              type="button"
              onClick={voice.listening ? voice.stop : voice.start}
              aria-pressed={voice.listening}
              className={`absolute bottom-2.5 right-2.5 grid size-10 place-items-center rounded-full transition-colors ${voice.listening ? 'bg-coral text-on-primary' : 'bg-surface-sunk text-ink-muted hover:text-ink'}`}
              aria-label={voice.listening ? 'Henti input suara' : 'Guna input suara'}
            >
              {voice.listening ? <MicOff className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
            </button>
          )}
        </div>
        {voice.listening && <p className="mt-2 text-[0.8125rem] font-[600] text-coral" role="status">Sedang mendengar… cakap dalam Bahasa Melayu.</p>}
        {voice.error && <p className="mt-2 text-[0.8125rem] text-coral" role="alert">{voice.error}</p>}
        <button type="submit" className="btn btn-primary mt-3 w-full sm:w-auto" disabled={!text.trim()}>
          <Sparkles className="size-5" aria-hidden /> Cari padanan
        </button>
        <div className="mt-5">
          <p className="text-[0.8125rem] font-[650] text-ink-muted">Cuba contoh:</p>
          <ul className="mt-2 space-y-2">
            {EXAMPLES.map((ex) => (
              <li key={ex}>
                <button type="button" className="w-full rounded-[12px] border border-line bg-surface px-3.5 py-2.5 text-left text-[0.9rem] text-ink transition-colors hover:border-line-strong" onClick={() => { setText(ex); submit(undefined, ex); }}>{ex}</button>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-5 flex items-start gap-2 text-[0.8125rem] text-ink-subtle">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Carian ini memadankan situasi kamu dengan peta konsep dan kata kunci yang disusun oleh pasukan LESTARI. Ia bukan model AI, dan hanya mencadangkan peribahasa daripada koleksi.
        </p>
      </form>

      <div ref={resultsRef} tabIndex={-1} aria-live="polite" className="min-w-0 outline-none">
        {!urlQ ? (
          <EmptyState art={<Mascot mood="read" className="size-24" />} title="Padanan akan dipaparkan di sini">
            Kami akan tunjukkan peribahasa yang sesuai, maksudnya, dan sebab ia sepadan dengan situasi kamu.
          </EmptyState>
        ) : tooShort ? (
          <EmptyState art={<Mascot mood="think" className="size-20" />} title="Ceritakan sedikit lagi">Tulis sekurang-kurangnya satu ayat pendek supaya padanan lebih tepat.</EmptyState>
        ) : response && (
          <SituationResults query={urlQ} results={response.results} weak={response.weak} related={response.relatedTerms} />
        )}
      </div>
    </div>
  );
}

const STRENGTH: Record<SituationResult['strength'], { label: string; cls: string }> = {
  kuat: { label: 'Padanan kuat', cls: 'bg-mint-soft text-mint' },
  sederhana: { label: 'Padanan sederhana', cls: 'bg-sun-soft text-sun-ink' },
  lemah: { label: 'Padanan lemah', cls: 'bg-surface-sunk text-ink-muted' },
};

function SituationResults({ query, results, weak, related }: { query: string; results: SituationResult[]; weak: boolean; related: string[] }) {
  return (
    <div className="space-y-4">
      {weak && (
        <div className="rounded-[var(--radius-lg)] border border-line-strong bg-surface p-5">
          <p className="font-[700]">Tiada padanan yang kukuh untuk situasi ini.</p>
          <p className="mt-1 text-[0.9375rem] text-ink-muted">
            Cuba terangkan apa yang dilakukan oleh watak dan akibatnya, contohnya “dia tidak mendengar nasihat” atau “mereka bekerjasama”.
            {results.length > 0 && ' Padanan lemah di bawah hanya berdasarkan beberapa perkataan.'}
          </p>
          {related.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {related.map((w) => <Link key={w} to={`/cari?mode=kata&q=${encodeURIComponent(w)}`} className="chip no-underline">Cari “{w}”</Link>)}
            </div>
          )}
        </div>
      )}
      {!weak && <p className="text-[0.875rem] text-ink-muted">Label padanan ialah anggaran kesesuaian berdasarkan peraturan, bukan ukuran kebarangkalian.</p>}
      {results.map((x, i) => (
        <article key={x.record.id} className={`card p-5 sm:p-6 ${i === 0 && !weak ? 'border-primary/40 shadow-[var(--shadow-rest)]' : ''} rise-in`} style={{ animationDelay: `${i * 50}ms` }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[0.78rem] font-[700] ${STRENGTH[x.strength].cls}`}>{STRENGTH[x.strength].label}</span>
            <CategoryBadge r={x.record} showBasis />
          </div>
          <h2 className="saying mt-3 text-[1.5rem] font-[560] leading-tight">
            <Link to={`/peribahasa/${x.record.id}`} className="no-underline hover:underline">{x.record.peribahasa}</Link>
          </h2>
          <p className="mt-1.5 text-ink-muted"><span className="font-[650] text-ink">Maksud: </span>{x.record.maksud}</p>

          {/* The match bridge: the student's own sentence with the words that drove the match. */}
          <div className="mt-4 rounded-[14px] bg-surface-sunk p-4">
            <p className="text-[0.8125rem] font-[650] text-ink-muted">Sebab padanan</p>
            <p className="mt-1 text-[0.9375rem] leading-relaxed"><Highlight text={query} terms={x.matched} /></p>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink">{x.sebab}</p>
          </div>

          {x.record.contohAyat[0] ? (
            <p className="mt-4 text-[0.9375rem]"><span className="font-[650]">Contoh ayat: </span>“{x.record.contohAyat[0].text}”</p>
          ) : (
            <p className="mt-4 text-[0.875rem] text-ink-subtle">Contoh ayat belum tersedia untuk peribahasa ini; lihat halaman perincian untuk contoh templat.</p>
          )}
          {x.alternatives.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-[0.8125rem] font-[650] text-ink-muted">Pilihan lain untuk situasi serupa</p>
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {x.alternatives.map((a) => <li key={a.id}><Link to={`/peribahasa/${a.id}`} className="chip saying no-underline">{a.peribahasa}</Link></li>)}
              </ul>
            </div>
          )}
          <Link to={`/peribahasa/${x.record.id}`} className="btn btn-quiet mt-3 -ml-3">Lihat perincian <ArrowRight className="size-4" aria-hidden /></Link>
        </article>
      ))}
    </div>
  );
}
