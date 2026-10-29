import { Link } from 'react-router';
import { ArrowRight, Timer } from 'lucide-react';
import { useProgress, useStore } from '../../app/store';
import { MODE_LABEL } from '../../lib/progress';
import { formatDateMs } from '../../lib/date';
import { useDocumentTitle } from '../../hooks/media';
import { SectionTitle, EmptyState } from '../../components/ui';
import { Mascot } from '../../components/Mascot';
import { EMOJI_PUZZLES } from '../../content/emoji';

const SAMPLE = EMOJI_PUZZLES[0];

export default function QuizHub() {
  useDocumentTitle('Kuiz');
  const store = useStore();
  const timer = useProgress((s) => s.settings.timer);
  const history = useProgress((s) => s.quizHistory);

  return (
    <div>
      <h1 className="text-[1.875rem] font-[740] leading-tight tracking-[-0.03em] sm:text-[2.25rem]">Kuiz</h1>
      <p className="mt-1 max-w-[56ch] text-ink-muted">Tiga cara berlatih, dari mengenal peribahasa hingga memilihnya dalam situasi sebenar. Setiap sesi ada 8 soalan, bermula dengan yang mudah.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link to="/kuiz/emoji" className="card card-link flex flex-col p-5 no-underline">
          <div className="rounded-[14px] bg-surface-sunk px-4 py-3">
            <span className="block text-[0.75rem] font-[650] text-ink-muted">Peribahasa apakah ini?</span>
            <span role="img" aria-label={`Contoh teka-teki: ${SAMPLE.label}`} className="mt-1 block text-[1.75rem] leading-none tracking-[0.1em]">{SAMPLE.emoji}</span>
          </div>
          <h2 className="mt-4 text-[1.25rem] font-[720]">Teka Emoji</h2>
          <p className="mt-1 flex-1 text-[0.9375rem] text-ink-muted">Baca gabungan emoji dan teka peribahasanya.</p>
          <span className="mt-4 inline-flex items-center gap-1 font-[680] text-primary">Main <ArrowRight className="size-4" aria-hidden /></span>
        </Link>

        <div className="card flex flex-col p-5">
          <p className="saying text-[1.125rem] leading-snug">Sehari selembar benang, lama-lama menjadi <span className="rounded bg-primary-soft px-1.5 text-on-primary-soft">____</span></p>
          <h2 className="mt-4 text-[1.25rem] font-[720]">Isi Tempat Kosong</h2>
          <p className="mt-1 flex-1 text-[0.9375rem] text-ink-muted">Lengkapkan peribahasa dengan perkataan yang betul.</p>
          <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[12px] bg-surface-sunk px-3">
            <span className="flex items-center gap-2 text-[0.875rem] font-[650]"><Timer className="size-4" aria-hidden />Pemasa 15 saat</span>
            <input type="checkbox" role="switch" checked={timer} onChange={(e) => store.setTimer(e.target.checked)} className="size-5 accent-[var(--color-primary)]" />
          </label>
          <Link to="/kuiz/kosong" className="btn btn-primary btn-sm mt-3">Main <ArrowRight className="size-4" aria-hidden /></Link>
        </div>

        <Link to="/kuiz/konteks" className="card card-link flex flex-col bg-night p-5 text-on-night no-underline md:border-night">
          <p className="text-[0.9375rem] leading-snug text-on-night-muted">“Ali baru mula mengulang kaji apabila peperiksaan tinggal seminggu…”</p>
          <h2 className="mt-4 text-[1.25rem] font-[720]">Pilih Peribahasa yang Sesuai</h2>
          <p className="mt-1 flex-1 text-[0.9375rem] text-on-night-muted">Fahami konteks. Soalan ini membina penguasaan sebenar.</p>
          <span className="mt-4 inline-flex items-center gap-1 font-[680] text-sun">Main <ArrowRight className="size-4" aria-hidden /></span>
        </Link>
      </div>

      <SectionTitle>Keputusan terkini</SectionTitle>
      {history.length ? (
        <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
          {history.slice(0, 6).map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-[650]">{MODE_LABEL[h.mode]}</p>
                <p className="text-[0.8125rem] text-ink-muted">{formatDateMs(h.date)}</p>
              </div>
              <p className="tnum text-right font-[700]">{h.correct}/{h.total}<span className="block text-[0.8125rem] font-[600] text-ink-muted">+{h.xp} XP</span></p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState art={<Mascot mood="happy" className="size-20" />} title="Belum ada kuiz">Mulakan dengan Teka Emoji; ia paling mudah untuk bermula.</EmptyState>
      )}
    </div>
  );
}
