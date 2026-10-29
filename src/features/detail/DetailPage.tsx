import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Bookmark, BookmarkCheck, Copy, Check, Volume2, Square, AlertTriangle, ExternalLink, Lightbulb, Shuffle, Puzzle } from 'lucide-react';
import { getRecord, THEMES, IMAGERY_LABEL, sourceTitle, STATUS_INFO, LEARNABLE, BY_ID } from '../../lib/data';
import { CONTRASTS } from '../../content/contrasts';
import { SITUATIONS } from '../../content/situations';
import { EMOJI_PUZZLES } from '../../content/emoji';
import { CategoryBadge, StatusBadge, PeribahasaRow, SectionTitle, EmptyState } from '../../components/ui';
import ClickSpark, { type ClickSparkHandle } from '../../components/ui/ClickSpark';
import { Mascot } from '../../components/Mascot';
import { useProgress, useStore } from '../../app/store';
import { useDocumentTitle, useSpeech } from '../../hooks/media';
import { seeded, shuffle, hashString } from '../../lib/random';
import type { Peribahasa } from '../../types/peribahasa';

const CONTEXTS = [
  { id: 'sekolah', label: 'Sekolah', make: (p: string, m: string) => `Semasa perhimpunan pagi, cikgu mengingatkan kami tentang peribahasa “${p}”, iaitu ${m}.` },
  { id: 'sukan', label: 'Sukan', make: (p: string, m: string) => `Selepas latihan bola sepak, jurulatih memetik peribahasa “${p}”, iaitu ${m}.` },
  { id: 'keluarga', label: 'Keluarga', make: (p: string, m: string) => `Ketika makan malam, ayah menasihati kami dengan peribahasa “${p}”, iaitu ${m}.` },
  { id: 'alam', label: 'Alam sekitar', make: (p: string, m: string) => `Dalam program kitar semula di taman kami, ketua penduduk menyebut peribahasa “${p}”, iaitu ${m}.` },
  { id: 'masyarakat', label: 'Masyarakat', make: (p: string, m: string) => `Dalam ucapan sempena Hari Kebangsaan, wakil rakyat memetik peribahasa “${p}”, iaitu ${m}.` },
];

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, '');

export default function DetailPage() {
  const { id } = useParams();
  const r = getRecord(id);
  useDocumentTitle(r ? r.peribahasa : 'Tidak ditemui');
  if (!r) {
    return (
      <EmptyState art={<Mascot mood="think" className="size-24" />} title="Peribahasa ini tidak ditemui" action={<Link to="/cari" className="btn btn-primary">Cari peribahasa</Link>}>
        Pautan mungkin lama atau tersalah taip. Cuba cari peribahasa itu dengan kata kunci.
      </EmptyState>
    );
  }
  return <Detail key={r.id} r={r} />;
}

function Detail({ r }: { r: Peribahasa }) {
  const store = useStore();
  const navigate = useNavigate();
  const saved = useProgress((s) => s.favourites.includes(r.id));
  const speech = useSpeech();
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const spark = useRef<ClickSparkHandle>(null);

  useEffect(() => { store.explore(r.id, r.peribahasa); }, [r.id, r.peribahasa, store]);

  const contrasts = CONTRASTS.filter((c) => c.a === r.id || c.b === r.id).map((c) => ({ other: BY_ID.get(c.a === r.id ? c.b : c.a)!, beza: c.beza }));
  const variants = r.variants.map((v) => BY_ID.get(v)).filter((x): x is Peribahasa => !!x);
  const related = r.relatedPeribahasa.map((v) => BY_ID.get(v)).filter((x): x is Peribahasa => !!x && !x.sensitive);
  const situations = SITUATIONS.filter((s) => s.answer === r.id);
  const inEmoji = EMOJI_PUZZLES.some((p) => p.answer === r.id);

  async function copy() {
    const text = `${r.peribahasa}\nMaksud: ${r.maksud}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied('ok');
    } catch {
      // Fallback for browsers that block the async clipboard API.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      setCopied(ok ? 'ok' : 'fail');
    }
    window.setTimeout(() => setCopied(null), 2200);
  }

  function toggleSave() {
    const nowSaved = store.toggleFavourite(r.id);
    if (nowSaved) spark.current?.spark();
  }

  return (
    <article className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-10">
      <div className="min-w-0">
        <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/cari'))} className="btn btn-quiet -ml-3 mb-3"><ArrowLeft className="size-4" aria-hidden />Kembali</button>

        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge r={r} showBasis />
          <StatusBadge r={r} />
        </div>
        <h1 className="saying mt-3 text-[2.125rem] font-[560] leading-[1.12] tracking-[-0.01em] sm:text-[2.75rem]">{r.peribahasa}</h1>

        <div className="mt-5 flex flex-wrap gap-2">
          <ClickSpark ref={spark} manual sparkColor={['#5B3FD8', '#FFC845', '#F2762E']} sparkCount={10} sparkRadius={28} className="!h-auto !w-auto">
            <button type="button" onClick={toggleSave} aria-pressed={saved} className={`btn btn-sm ${saved ? 'btn-primary' : 'btn-secondary'}`}>
              <span key={String(saved)} className={saved ? 'pop inline-flex' : 'inline-flex'}>{saved ? <BookmarkCheck className="size-4" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}</span>
              {saved ? 'Disimpan' : 'Simpan'}
            </button>
          </ClickSpark>
          <button type="button" onClick={copy} className="btn btn-secondary btn-sm">
            {copied === 'ok' ? <Check className="pop size-4 text-mint" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied === 'ok' ? 'Disalin' : copied === 'fail' ? 'Gagal disalin' : 'Salin'}
          </button>
          <button
            type="button"
            onClick={() => (speech.status === 'speaking' ? speech.stop() : speech.speak(`${r.peribahasa}. Maksudnya, ${r.maksud}`))}
            disabled={!speech.supported}
            className="btn btn-secondary btn-sm"
            title={speech.supported ? undefined : 'Pelayar ini tidak menyokong bacaan suara'}
          >
            {speech.status === 'speaking' ? <Square className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
            {speech.status === 'speaking' ? 'Henti' : 'Dengar'}
          </button>
          <span className="sr-only" aria-live="polite">{copied === 'ok' ? 'Peribahasa disalin ke papan klip' : ''}</span>
        </div>
        {!speech.supported && <p className="mt-2 text-[0.8125rem] text-ink-subtle">Bacaan suara tidak disokong oleh pelayar ini.</p>}
        {speech.status === 'error' && <p className="mt-2 text-[0.8125rem] text-coral" role="alert">Bacaan suara gagal. Cuba lagi atau semak tetapan suara peranti.</p>}
        {speech.voiceNote && speech.status !== 'unsupported' && <p className="mt-2 text-[0.8125rem] text-ink-subtle">{speech.voiceNote}</p>}

        {r.reviewNotes.length > 0 && (
          <div role="note" className="mt-6 flex gap-3 rounded-[var(--radius-md)] bg-sun-soft p-4 text-[0.9375rem] text-sun-ink">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div><p className="font-[700]">Perlu semakan guru</p><p className="mt-0.5">{r.reviewNotes.join(' ')}</p></div>
          </div>
        )}

        <section aria-labelledby="maksud" className="mt-8">
          <h2 id="maksud" className="text-[1.125rem] font-[700]">Maksud</h2>
          <p className="mt-1.5 text-[1.1875rem] leading-relaxed">{r.maksud}</p>
          {r.maksudAsal && <p className="mt-1.5 text-[0.8125rem] text-ink-subtle">Ejaan dibetulkan. Teks asal sumber: “{r.maksudAsal}”</p>}
        </section>

        {r.bilaSesuai && (
          <section aria-labelledby="bila" className="mt-8">
            <h2 id="bila" className="text-[1.125rem] font-[700]">Bila sesuai digunakan?</h2>
            <p className="mt-1.5 leading-relaxed">{r.bilaSesuai}</p>
            {r.usageTip && <p className="mt-3 flex gap-2 text-[0.9375rem] text-ink-muted"><Lightbulb className="mt-0.5 size-4 shrink-0 text-casque" aria-hidden />{r.usageTip}</p>}
          </section>
        )}

        <Examples r={r} />

        {situations.length > 0 && (
          <section aria-labelledby="sebenar" className="mt-8">
            <h2 id="sebenar" className="text-[1.125rem] font-[700]">Contoh dalam kehidupan sebenar</h2>
            <ul className="mt-2 space-y-2">
              {situations.map((s) => <li key={s.id} className="rounded-[14px] bg-surface-sunk p-4 leading-relaxed">{s.situasi} <span className="text-ink-muted">{s.penerangan}</span></li>)}
            </ul>
          </section>
        )}

        {(contrasts.length > 0 || variants.length > 0 || r.commonMistakes.length > 0) && (
          <section aria-labelledby="keliru" className="mt-8">
            <h2 id="keliru" className="text-[1.125rem] font-[700]">Jangan keliru dengan…</h2>
            <div className="mt-2 space-y-3">
              {contrasts.map(({ other, beza }) => (
                <div key={other.id} className="card p-4">
                  <Link to={`/peribahasa/${other.id}`} className="saying text-[1.125rem] no-underline hover:underline">{other.peribahasa}</Link>
                  <p className="mt-1 text-[0.9375rem] text-ink-muted">{beza}</p>
                </div>
              ))}
              {r.commonMistakes.map((m) => <p key={m} className="flex gap-2 text-[0.9375rem]"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-sun-ink" aria-hidden />{m}</p>)}
              {variants.length > 0 && (
                <div>
                  <p className="text-[0.875rem] font-[650] text-ink-muted">Bentuk lain peribahasa yang sama dalam koleksi:</p>
                  <ul className="mt-1.5 flex flex-wrap gap-2">{variants.map((v) => <li key={v.id}><Link to={`/peribahasa/${v.id}`} className="chip saying no-underline">{v.peribahasa}</Link></li>)}</ul>
                </div>
              )}
            </div>
          </section>
        )}

        {!r.sensitive && <MeaningCheck r={r} />}
      </div>

      <aside className="min-w-0 space-y-8">
        {(situations.length > 0 || inEmoji) && (
          <div className="rounded-[var(--radius-lg)] bg-primary-soft p-5">
            <p className="font-[700] text-on-primary-soft">Latih peribahasa ini</p>
            <p className="mt-1 text-[0.9rem] text-on-primary-soft/90">Peribahasa ini muncul dalam {situations.length > 0 ? 'kuiz Pilih Peribahasa' : 'Teka Emoji'}.</p>
            <Link to={situations.length > 0 ? '/kuiz/konteks' : '/kuiz/emoji'} className="btn btn-primary btn-sm mt-3"><Puzzle className="size-4" aria-hidden />Mula kuiz</Link>
          </div>
        )}

        <section aria-labelledby="tema">
          <h2 id="tema" className="text-[1rem] font-[700]">Tema</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {r.themes.map((t) => <Link key={t} to={`/cari?mode=kata&tema=${t}`} className="chip no-underline">{THEMES[t].label}</Link>)}
          </div>
          {r.imagery.length > 0 && (
            <p className="mt-3 text-[0.875rem] text-ink-muted">Imej yang digunakan: {r.imagery.map((i) => IMAGERY_LABEL[i]).join(', ')}</p>
          )}
          {r.tingkatan.length > 0 && <p className="mt-1 text-[0.875rem] text-ink-muted">Dalam senarai {r.tingkatan.join(', ')}</p>}
        </section>

        <section aria-labelledby="sumber">
          <h2 id="sumber" className="text-[1rem] font-[700]">Sumber dan pengesahan</h2>
          <p className="mt-1 text-[0.875rem] text-ink-muted">{STATUS_INFO[r.verificationStatus].label}.</p>
          <ul className="mt-2 space-y-2.5">
            {r.sources.map((s, i) => (
              <li key={`${s.id}-${i}`} className="border-t border-line pt-2.5 text-[0.875rem]">
                <p className="font-[650]">{sourceTitle(s.id)}</p>
                {s.tingkatan && <p className="text-ink-muted">{s.tingkatan}</p>}
                {s.page && <p className="text-ink-muted">Halaman {s.page}</p>}
                {s.maksud && <p className="mt-0.5 text-ink-muted">Maksud dalam sumber ini: {s.maksud}</p>}
                {s.note && <p className="mt-0.5 text-ink-muted">{s.note}</p>}
                {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 font-[650] text-primary-ink">Lihat di PRPM <ExternalLink className="size-3.5" aria-hidden /></a>}
              </li>
            ))}
          </ul>
          {r.categoryBasis === 'peraturan' && <p className="mt-3 text-[0.8125rem] text-ink-subtle">Kategori “{r.category}” dianggarkan oleh peraturan kerana sumber tidak menyatakan kategori.</p>}
        </section>

        {related.length > 0 && (
          <section aria-labelledby="berkaitan">
            <SectionTitle id="berkaitan">Peribahasa berkaitan</SectionTitle>
            <div className="space-y-3">{related.map((x) => <PeribahasaRow key={x.id} r={x} />)}</div>
          </section>
        )}
      </aside>
    </article>
  );
}

function Examples({ r }: { r: Peribahasa }) {
  const [ctx, setCtx] = useState<string | null>(null);
  const template = ctx ? CONTEXTS.find((c) => c.id === ctx)!.make(r.peribahasa, lowerFirst(r.maksud)) : null;
  return (
    <section aria-labelledby="contoh" className="mt-8">
      <h2 id="contoh" className="text-[1.125rem] font-[700]">Contoh ayat</h2>
      {r.contohAyat.length ? (
        <ul className="mt-2 space-y-2">
          {r.contohAyat.map((c) => (
            <li key={c.text} className="rounded-[14px] border border-line bg-surface p-4 leading-relaxed">
              {c.text}
              <span className="mt-2 block text-[0.75rem] font-[600] text-ink-subtle">Contoh ditulis oleh pasukan LESTARI, bukan petikan sumber.</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[0.9375rem] text-ink-muted">Sumber tidak menyertakan contoh ayat untuk peribahasa ini.</p>
      )}
      <div className="mt-4">
        <p className="text-[0.875rem] font-[650]">Jana contoh mengikut tema</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Tema contoh">
          {CONTEXTS.map((c) => <button key={c.id} type="button" className="chip" aria-pressed={ctx === c.id} onClick={() => setCtx(ctx === c.id ? null : c.id)}>{c.label}</button>)}
        </div>
        {template && (
          <div className="rise-in mt-3 rounded-[14px] bg-surface-sunk p-4 leading-relaxed" aria-live="polite">
            {template}
            <span className="mt-2 block text-[0.75rem] font-[600] text-ink-subtle">Contoh templat: dibina daripada maksud yang tercatat, bukan ayat asli atau janaan AI. Gunakan sebagai panduan, kemudian tulis ayat kamu sendiri.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function MeaningCheck({ r }: { r: Peribahasa }) {
  const store = useStore();
  const [picked, setPicked] = useState<number | null>(null);
  const spark = useRef<ClickSparkHandle>(null);
  const { options, correct } = useMemo(() => {
    const rand = seeded(hashString(r.id));
    const pool = LEARNABLE.filter((o) => o.id !== r.id && !r.variants.includes(o.id) && o.themes[0] !== r.themes[0] && o.maksud.length > 14);
    const wrong = shuffle(pool, rand).slice(0, 2).map((o) => o.maksud);
    const opts = shuffle([r.maksud, ...wrong], rand);
    return { options: opts, correct: opts.indexOf(r.maksud) };
  }, [r]);

  function answer(i: number) {
    if (picked !== null) return;
    setPicked(i);
    store.answerQuiz({ sessionId: `detail:${new Date().toDateString()}`, questionKey: r.id, mode: 'maksud', recordId: r.id, correct: i === correct });
    if (i === correct) spark.current?.spark();
  }

  return (
    <section aria-labelledby="cuba" className="mt-10 rounded-[var(--radius-xl)] border border-line bg-surface p-5 sm:p-6">
      <h2 id="cuba" className="text-[1.125rem] font-[700]">Cuba jawab soalan ini</h2>
      <p className="mt-1 text-ink-muted">Yang manakah maksud sebenar <span className="saying text-ink">{r.peribahasa}</span>?</p>
      <ClickSpark ref={spark} manual sparkColor={['#2BB673', '#FFC845']} sparkCount={12} sparkRadius={40} className="!h-auto">
        <div className="mt-4 space-y-2">
          {options.map((o, i) => {
            const state = picked === null ? 'idle' : i === correct ? 'correct' : i === picked ? 'wrong' : 'dim';
            return (
              <button
                key={o}
                type="button"
                onClick={() => answer(i)}
                disabled={picked !== null}
                className={`flex w-full items-start gap-3 rounded-[14px] border px-4 py-3 text-left transition-colors duration-150 ${state === 'correct' ? 'border-mint bg-mint-soft' : state === 'wrong' ? 'border-coral bg-coral-soft' : state === 'dim' ? 'border-line opacity-60' : 'border-line-strong bg-surface hover:border-primary'}`}
              >
                <span className="tnum mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-sunk text-[0.8125rem] font-[700]">{String.fromCharCode(65 + i)}</span>
                <span>{o}</span>
              </button>
            );
          })}
        </div>
      </ClickSpark>
      {picked !== null && (
        <p role="status" className={`mt-3 font-[650] ${picked === correct ? 'text-mint' : 'text-coral'}`}>
          {picked === correct ? 'Bagus! Kamu memahami maksudnya.' : 'Hampir tepat! Cuba fahami maksudnya sekali lagi di atas.'}
        </p>
      )}
      {picked !== null && <button type="button" className="btn btn-quiet mt-1 -ml-3" onClick={() => setPicked(null)}><Shuffle className="size-4" aria-hidden />Cuba semula</button>}
    </section>
  );
}
