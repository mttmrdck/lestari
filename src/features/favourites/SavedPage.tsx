import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search, Trash2, Layers, BookmarkX, RotateCcw } from 'lucide-react';
import { useProgress, useStore } from '../../app/store';
import { mistakeIds } from '../../lib/progress';
import { BY_ID } from '../../lib/data';
import { normalize } from '../../lib/text';
import { KATEGORI, type Kategori, type Peribahasa } from '../../types/peribahasa';
import { useDocumentTitle } from '../../hooks/media';
import { PeribahasaRow, EmptyState, Segmented } from '../../components/ui';
import { Mascot } from '../../components/Mascot';

type Tab = 'simpanan' | 'kesilapan';

export default function SavedPage() {
  useDocumentTitle('Simpanan');
  const store = useStore();
  const favourites = useProgress((s) => s.favourites);
  const state = useProgress((s) => s);
  const [tab, setTab] = useState<Tab>('simpanan');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Kategori | null>(null);

  const saved = favourites.map((id) => BY_ID.get(id)).filter((r): r is Peribahasa => !!r);
  // Mistakes: sayings whose latest quiz answer was wrong, plus ones saved for revision after a quiz.
  const mistakes = useMemo(() => mistakeIds(state).map((id) => BY_ID.get(id)).filter((r): r is Peribahasa => !!r), [state]);
  const list = tab === 'simpanan' ? saved : mistakes;
  const nq = normalize(q);
  const shown = list.filter((r) => (!cat || r.category === cat) && (!nq || r.normalizedText.includes(nq) || normalize(r.maksud).includes(nq)));

  return (
    <div>
      <h1 className="text-[2rem] font-[900] leading-tight">Simpanan</h1>
      <p className="mt-1 font-[650] text-ink-muted">Peribahasa yang kamu simpan, dan yang pernah tersilap untuk diulang kaji.</p>
      <div className="mt-5 max-w-[520px]">
        <Segmented label="Senarai" value={tab} onChange={setTab} options={[{ value: 'simpanan', label: `Disimpan (${saved.length})` }, { value: 'kesilapan', label: `Kesilapan (${mistakes.length})` }]} />
      </div>

      {list.length > 0 && (
        <>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-[420px] flex-1">
              <label htmlFor="cari-simpan" className="sr-only">Cari dalam senarai</label>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-subtle" aria-hidden />
              <input id="cari-simpan" type="search" className="field pl-12" placeholder="Cari dalam senarai ini" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Link to={`/kad-imbas?dari=${tab}`} className="btn btn-primary shrink-0"><Layers className="size-5" aria-hidden />Kad imbas senarai ini</Link>
          </div>
          <div className="scroll-row mt-3" role="group" aria-label="Tapis kategori">
            <button type="button" className="chip" aria-pressed={!cat} onClick={() => setCat(null)}>Semua</button>
            {KATEGORI.filter((k) => list.some((r) => r.category === k)).map((k) => <button key={k} type="button" className="chip" aria-pressed={cat === k} onClick={() => setCat(cat === k ? null : k)}>{k}</button>)}
          </div>
        </>
      )}

      <div className="mt-5">
        {list.length === 0 ? (
          tab === 'simpanan' ? (
            <EmptyState art={<Mascot mood="read" idle className="size-28" />} title="Belum ada peribahasa disimpan" action={<Link to="/cari" className="btn btn-primary">Cari peribahasa</Link>}>
              Tekan butang Simpan pada mana-mana peribahasa. Ia akan muncul di sini dan dalam kad imbas kamu.
            </EmptyState>
          ) : (
            <EmptyState art={<Mascot mood="cheer" idle className="size-28" />} title="Tiada kesilapan untuk diulang kaji" action={<Link to="/kuiz" className="btn btn-primary">Cuba kuiz</Link>}>
              Peribahasa yang tersilap dijawab dalam kuiz atau pelajaran akan disenaraikan di sini.
            </EmptyState>
          )
        ) : shown.length === 0 ? (
          <EmptyState art={<Mascot mood="think" className="size-20" />} title="Tiada padanan dalam senarai ini">Cuba kata lain atau buang tapisan kategori.</EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {shown.map((r) => (
              <li key={r.id} className="relative">
                <PeribahasaRow r={r} trailing={<span className="size-10 shrink-0" />} />
                <button
                  type="button"
                  className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-ink-subtle hover:bg-coral-soft hover:text-coral"
                  aria-label={tab === 'simpanan' ? `Buang “${r.peribahasa}” daripada simpanan` : `Tanda “${r.peribahasa}” sudah diulang kaji`}
                  onClick={() => (tab === 'simpanan' ? store.toggleFavourite(r.id) : store.clearMistake(r.id))}
                >
                  {tab === 'simpanan' ? <Trash2 className="size-5" aria-hidden /> : <BookmarkX className="size-5" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {tab === 'kesilapan' && mistakes.length > 0 && (
        <Link to="/kuiz/maksud?dari=kesilapan" className="btn btn-secondary mt-5"><RotateCcw className="size-5" aria-hidden />Kuiz Teka Maksud daripada kesilapan</Link>
      )}
    </div>
  );
}
