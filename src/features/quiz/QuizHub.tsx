import { Link } from 'react-router';
import { ArrowRight, Timer, BookOpenCheck, TextCursorInput, MessagesSquare, Smile, Layers, CalendarCheck, Map, Bookmark } from 'lucide-react';
import { useProgress, useStore } from '../../app/store';
import { MODE_LABEL } from '../../lib/progress';
import { formatDateMs } from '../../lib/date';
import { useDocumentTitle } from '../../hooks/media';
import { EmptyState } from '../../components/ui';
import { Mascot } from '../../components/Mascot';
import { EMOJI_PUZZLES } from '../../content/emoji';

const SAMPLE = EMOJI_PUZZLES[0];

const MODES = [
  { to: '/kuiz/maksud', icon: BookOpenCheck, title: 'Teka Maksud', text: 'Baca peribahasa, pilih maksudnya yang betul.', sample: <p className="saying text-[1.25rem] leading-snug">Harapkan pagar, pagar makan padi</p>, cls: 'bg-primary-soft border-primary [--edge:var(--color-primary-edge)]', icon_cls: 'bg-primary text-on-primary' },
  { to: '/kuiz/kosong', icon: TextCursorInput, title: 'Lengkapkan Peribahasa', text: 'Isi perkataan yang hilang.', sample: <p className="saying text-[1.25rem] leading-snug">Sehari selembar benang, lama-lama menjadi <span className="rounded-[8px] bg-surface px-1.5 text-lavender-ink">____</span></p>, cls: 'bg-lavender-soft border-lavender [--edge:var(--color-lavender-edge)]', icon_cls: 'bg-lavender text-on-lavender', timer: true },
  { to: '/kuiz/konteks', icon: MessagesSquare, title: 'Padankan Situasi', text: 'Baca situasi sebenar, pilih peribahasa yang paling sesuai.', sample: <p className="text-[1rem] font-[700] leading-snug">“Ali baru mula mengulang kaji apabila peperiksaan tinggal seminggu…”</p>, cls: 'bg-rose-soft border-rose [--edge:var(--color-rose-edge)]', icon_cls: 'bg-rose text-on-rose' },
  { to: '/kuiz/emoji', icon: Smile, title: 'Kuiz Emoji', text: 'Teka peribahasa daripada petunjuk gambar.', sample: <span role="img" aria-label={`Contoh teka-teki: ${SAMPLE.label}`} className="block text-[2rem] leading-none tracking-[0.12em]">{SAMPLE.emoji}</span>, cls: 'bg-sun-soft border-sun [--edge:var(--color-sun-edge)]', icon_cls: 'bg-sun text-ink' },
  { to: '/kad-imbas?mula=1', icon: Layers, title: 'Kad Imbas', text: 'Lihat peribahasa, dedahkan maksud, nilai ingatan kamu.', sample: <p className="saying text-[1.25rem] leading-snug">Bagai aur dengan tebing</p>, cls: 'bg-sky-soft border-sky [--edge:var(--color-sky-edge)]', icon_cls: 'bg-sky text-on-sky' },
];

export default function QuizHub() {
  useDocumentTitle('Belajar');
  const store = useStore();
  const timer = useProgress((s) => s.settings.timer);
  const history = useProgress((s) => s.quizHistory);

  return (
    <div>
      <div className="flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[2rem] font-[900] leading-tight">Belajar</h1>
          <p className="mt-1 max-w-[56ch] font-[650] text-ink-muted">Pilih cara berlatih. Setiap kuiz ada 8 soalan, bermula dengan yang mudah.</p>
        </div>
        <Mascot mood="cheer" idle className="hidden size-24 shrink-0 sm:block" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link to="/laluan" className="card card-link flex min-h-14 items-center gap-2.5 px-3.5 py-2 font-[850] no-underline"><Map className="size-5 shrink-0 text-primary-ink" strokeWidth={2.6} aria-hidden />Laluan</Link>
        <Link to="/simpanan" className="card card-link flex min-h-14 items-center gap-2.5 px-3.5 py-2 font-[850] no-underline"><Bookmark className="size-5 shrink-0 text-sky-ink" strokeWidth={2.6} aria-hidden />Simpanan</Link>
      </div>

      <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODES.map(({ to, icon: Icon, title, text, sample, cls, icon_cls, timer: hasTimer }) => (
          <li key={to} className={`flex flex-col rounded-[22px] border-2 p-5 shadow-[0_5px_0_var(--edge)] ${cls}`}>
            <div className="flex items-center gap-3">
              <span className={`grid size-12 place-items-center rounded-[14px] ${icon_cls}`}><Icon className="size-6" strokeWidth={2.6} aria-hidden /></span>
              <h2 className="text-[1.25rem] font-[900] leading-tight">{title}</h2>
            </div>
            <div className="mt-4 rounded-[16px] bg-surface/80 p-4">{sample}</div>
            <p className="mt-3 flex-1 font-[650] text-ink-muted">{text}</p>
            {hasTimer && (
              <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[12px] bg-surface px-3 font-[800]">
                <span className="flex items-center gap-2 text-[0.9375rem]"><Timer className="size-4" aria-hidden />Pemasa 15 saat</span>
                <input type="checkbox" role="switch" checked={timer} onChange={(e) => store.setTimer(e.target.checked)} className="size-5 accent-[var(--color-lavender-ink)]" />
              </label>
            )}
            <Link to={to} className="btn btn-primary mt-4 w-full">Mula <ArrowRight className="size-5" aria-hidden /></Link>
          </li>
        ))}
        <li className="on-night flex flex-col rounded-[22px] bg-night p-5 text-on-night shadow-[0_5px_0_var(--color-night-raised)]">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-[14px] bg-sky text-on-sky"><CalendarCheck className="size-6" strokeWidth={2.6} aria-hidden /></span>
            <h2 className="text-[1.25rem] font-[900] leading-tight">Peribahasa Hari Ini</h2>
          </div>
          <p className="mt-3 flex-1 font-[650] text-on-night-muted">Satu teka-teki sehari dengan petunjuk berperingkat. Ganjaran sehingga +30 XP.</p>
          <Link to="/harian" className="btn btn-sun mt-4 w-full">Main <ArrowRight className="size-5" aria-hidden /></Link>
        </li>
      </ul>

      <h2 className="mb-3 mt-10 text-[1.375rem] font-[900]">Keputusan terkini</h2>
      {history.length ? (
        <ul className="divide-y-2 divide-line rounded-[var(--radius-lg)] border-2 border-line bg-surface">
          {history.slice(0, 6).map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-[850]">{MODE_LABEL[h.mode]}</p>
                <p className="text-[0.8125rem] font-[650] text-ink-muted">{formatDateMs(h.date)}</p>
              </div>
              <p className="tnum text-right font-[900]">{h.correct}/{h.total}<span className="block text-[0.8125rem] font-[750] text-sun-ink">+{h.xp} XP</span></p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState art={<Mascot mood="happy" idle className="size-24" />} title="Belum ada kuiz">Mulakan dengan Kuiz Emoji atau Teka Maksud; kedua-duanya paling mudah untuk bermula.</EmptyState>
      )}
    </div>
  );
}
