import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Sheet } from '../../components/ui';
import { useStore } from '../../app/store';

const GOALS = [
  { value: 30, label: 'Santai', hint: '30 XP sehari' },
  { value: 50, label: 'Biasa', hint: '50 XP sehari' },
  { value: 80, label: 'Bersungguh', hint: '80 XP sehari' },
];

export function Onboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const navigate = useNavigate();
  const current = store.getState().profile;
  const [name, setName] = useState(current?.name ?? '');
  const [level, setLevel] = useState<'rendah' | 'menengah'>(current?.level ?? 'menengah');
  const [goal, setGoal] = useState(current?.dailyGoal ?? 50);

  function submit(e: FormEvent) {
    e.preventDefault();
    store.setProfile({ name: name.trim().slice(0, 24) || 'Pelajar', level, dailyGoal: goal });
    onClose();
    navigate('/');
  }

  return (
    <Sheet open={open} onClose={onClose} title={current ? 'Kemas kini profil' : 'Jom mulakan'}>
      <form onSubmit={submit} className="space-y-6">
        <div>
          <label htmlFor="nama" className="text-[0.875rem] font-[650]">Nama panggilan</label>
          <input id="nama" className="field mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Aina" autoComplete="nickname" maxLength={24} />
          <p className="mt-1 text-[0.8125rem] text-ink-subtle">Boleh dibiarkan kosong.</p>
        </div>
        <fieldset>
          <legend className="text-[0.875rem] font-[650]">Tahap persekolahan</legend>
          <div role="radiogroup" aria-label="Tahap persekolahan" className="mt-2 grid grid-cols-2 gap-2">
            {([['rendah', 'Sekolah rendah'], ['menengah', 'Sekolah menengah']] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={level === v} onClick={() => setLevel(v)} className="chip min-h-12 justify-center rounded-[12px]">{l}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-[0.875rem] font-[650]">Matlamat harian</legend>
          <div role="radiogroup" aria-label="Matlamat harian" className="mt-2 grid grid-cols-3 gap-2">
            {GOALS.map((g) => (
              <button key={g.value} type="button" role="radio" aria-checked={goal === g.value} onClick={() => setGoal(g.value)} className="chip h-auto min-h-14 flex-col justify-center gap-0 rounded-[12px] py-2">
                <span>{g.label}</span>
                <span className="text-[0.75rem] font-[500] opacity-80">{g.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="btn btn-primary w-full">{current ? 'Simpan' : 'Mula Belajar'}</button>
      </form>
    </Sheet>
  );
}
