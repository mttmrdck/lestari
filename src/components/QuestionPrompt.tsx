import type { QuizQuestion } from '../lib/quiz';

/** The question body for every quiz mode, shared by the quiz player and lessons. */
export function QuestionPrompt({ q }: { q: QuizQuestion }) {
  if (q.mode === 'emoji') {
    return (
      <div className="mt-4 rounded-[var(--radius-xl)] border-2 border-line bg-surface px-4 py-8 text-center">
        <p className="text-[1rem] font-[800] text-ink-muted">Peribahasa apakah ini?</p>
        <p role="img" aria-label={q.promptLabel} className="mt-3 text-[2.75rem] leading-tight tracking-[0.08em] sm:text-[3.5rem]">{q.prompt}</p>
      </div>
    );
  }
  if (q.mode === 'kosong') {
    return (
      <div className="mt-4">
        <p className="text-[1rem] font-[800] text-ink-muted">Lengkapkan peribahasa ini:</p>
        <p className="saying mt-2 text-[1.75rem] leading-snug sm:text-[2rem]">
          {q.prompt.split('____').map((part, i, arr) => (
            <span key={i}>{part}{i < arr.length - 1 && <span className="mx-1 inline-block min-w-[4ch] rounded-[10px] border-b-4 border-sky bg-sky-soft px-2 text-center text-sky-ink" aria-label="tempat kosong">?</span>}</span>
          ))}
        </p>
      </div>
    );
  }
  if (q.mode === 'maksud') {
    return (
      <div className="mt-4">
        <p className="text-[1rem] font-[800] text-ink-muted">Apakah maksud peribahasa ini?</p>
        <p className="saying mt-2 text-[1.75rem] leading-snug sm:text-[2rem]">{q.prompt}</p>
      </div>
    );
  }
  return (
    <div className="mt-4">
      <p className="text-[1rem] font-[800] text-ink-muted">Pilih peribahasa yang paling sesuai untuk situasi ini:</p>
      <p className="mt-2 rounded-[var(--radius-lg)] border-2 border-line bg-surface p-5 text-[1.125rem] font-[650] leading-relaxed">{q.prompt}</p>
    </div>
  );
}

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim';

export function optionClass(state: OptionState) {
  switch (state) {
    case 'correct': return 'pop border-mint-bright bg-mint-soft text-mint shadow-[0_4px_0_var(--color-primary-edge)]';
    case 'wrong': return 'shake border-coral bg-coral-soft text-coral shadow-[0_4px_0_var(--color-coral)]';
    case 'selected': return 'border-sky bg-sky-soft text-sky-ink shadow-[0_4px_0_var(--color-sky-edge)]';
    case 'dim': return 'border-line opacity-55 shadow-[0_4px_0_var(--color-line)]';
    default: return 'border-line-strong bg-surface hover:bg-sky-soft/50 shadow-[0_4px_0_var(--color-line-strong)]';
  }
}
