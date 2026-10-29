import { Link } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { RECORDS, SOURCES, STATUS_INFO } from '../../lib/data';
import { KATEGORI } from '../../types/peribahasa';
import { useDocumentTitle } from '../../hooks/media';

export default function AboutPage() {
  useDocumentTitle('Tentang data');
  const count = (f: (r: (typeof RECORDS)[number]) => boolean) => RECORDS.filter(f).length;
  const flagged = RECORDS.filter((r) => r.verificationStatus === 'perlu-semakan');
  return (
    <div className="max-w-[760px]">
      <h1 className="text-[1.875rem] font-[740] leading-tight tracking-[-0.03em] sm:text-[2.25rem]">Tentang data</h1>
      <p className="mt-2 text-ink-muted">LESTARI mengandungi {RECORDS.length} peribahasa. Halaman ini menerangkan dari mana ia datang dan sejauh mana ia telah disemak.</p>

      <h2 className="mt-10 text-[1.25rem] font-[700]">Sumber</h2>
      <ul className="mt-3 space-y-3">
        {SOURCES.map((s) => (
          <li key={s.id} className="card p-4">
            <p className="font-[680]">{s.title}</p>
            <p className="mt-0.5 text-[0.875rem] text-ink-muted">{s.origin}</p>
            <p className="tnum mt-1 text-[0.8125rem] text-ink-subtle">{count((r) => r.sources.some((x) => x.id === s.id))} peribahasa merujuk sumber ini</p>
            {s.kind === 'rujukan-luar' && <a href="https://prpm.dbp.gov.my" target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[0.875rem] font-[650] text-primary-ink">prpm.dbp.gov.my <ExternalLink className="size-3.5" aria-hidden /></a>}
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-[1.25rem] font-[700]">Tahap pengesahan</h2>
      <dl className="mt-3 divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
        {(Object.keys(STATUS_INFO) as (keyof typeof STATUS_INFO)[]).map((k) => (
          <div key={k} className="flex items-center justify-between gap-3 px-4 py-3">
            <dt>{STATUS_INFO[k].label}</dt>
            <dd className="tnum m-0 font-[700]">{count((r) => r.verificationStatus === k)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[0.9375rem] text-ink-muted">Dokumen yang dibekalkan ialah kompilasi dari internet, jadi “terdapat dalam beberapa sumber” bermaksud konsisten, bukan disahkan secara rasmi. Hanya rekod bertanda PRPM telah dibandingkan dengan Pusat Rujukan Persuratan Melayu, Dewan Bahasa dan Pustaka.</p>

      <h2 className="mt-10 text-[1.25rem] font-[700]">Kategori</h2>
      <p className="mt-2 text-[0.9375rem] text-ink-muted">Sumber tidak menyatakan kategori. Kategori dianggarkan dengan peraturan (perkataan perbandingan menjadi perumpamaan, ungkapan pendek menjadi simpulan bahasa, nasihat menjadi bidalan, selebihnya pepatah) dan beberapa ditetapkan secara manual.</p>
      <ul className="mt-3 flex flex-wrap gap-2">{KATEGORI.map((k) => <li key={k} className="chip cursor-default">{k}: {count((r) => r.category === k)}</li>)}</ul>

      <h2 className="mt-10 text-[1.25rem] font-[700]">Kandungan pembelajaran</h2>
      <p className="mt-2 text-[0.9375rem] text-ink-muted">
        {count((r) => r.contohAyat.length > 0)} peribahasa mempunyai contoh ayat yang ditulis oleh pasukan LESTARI; contoh ini dilabel dengan jelas dan bukan petikan sumber. Contoh templat pada halaman peribahasa dibina daripada maksud yang tercatat. {count((r) => r.sensitive)} peribahasa yang mengandungi unsur dewasa atau stereotaip boleh dicari tetapi tidak digunakan dalam kuiz.
      </p>

      <h2 className="mt-10 text-[1.25rem] font-[700]">Perlu semakan guru ({flagged.length})</h2>
      <ul className="mt-3 space-y-2">
        {flagged.map((r) => (
          <li key={r.id} className="text-[0.9375rem]"><Link to={`/peribahasa/${r.id}`} className="saying font-[600]">{r.peribahasa}</Link><span className="text-ink-muted">: {r.reviewNotes[0]}</span></li>
        ))}
      </ul>
    </div>
  );
}
