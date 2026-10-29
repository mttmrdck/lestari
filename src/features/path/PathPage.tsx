import { useMemo } from 'react';
import { useProgress } from '../../app/store';
import { UNITS, LESSONS, nodeStates } from '../../lib/lessons';
import { UnitBanner, PathNodes } from '../../components/LearningPath';
import { ProgressBar } from '../../components/ui';
import { useDocumentTitle } from '../../hooks/media';

export default function PathPage() {
  useDocumentTitle('Laluan pembelajaran');
  const done = useProgress((s) => s.lessonsDone);
  const states = useMemo(() => nodeStates(done), [done]);
  const total = Object.keys(done).length;
  return (
    <div className="mx-auto max-w-[640px]">
      <h1 className="text-[2rem] font-[900] leading-tight">Laluan pembelajaran</h1>
      <p className="mt-1 font-[650] text-ink-muted">{UNITS.length} unit, {LESSONS.length} pelajaran. Setiap pelajaran memperkenalkan empat peribahasa, kemudian menguji kamu.</p>
      <div className="mt-4 flex items-center gap-3">
        <ProgressBar value={total} max={LESSONS.length} label="Pelajaran selesai" className="h-3.5 flex-1" />
        <span className="tnum text-[0.9375rem] font-[850]">{total}/{LESSONS.length}</span>
      </div>
      <div className="mt-8 space-y-6">
        {UNITS.map((u, i) => (
          <section key={u.id} aria-label={u.title}>
            <UnitBanner unit={u} number={i + 1} done={u.lessons.filter((l) => done[l.id]).length} />
            <PathNodes unit={u} states={states} />
          </section>
        ))}
      </div>
    </div>
  );
}
