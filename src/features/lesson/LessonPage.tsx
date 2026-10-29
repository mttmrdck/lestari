import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { X, Volume2, CheckCircle2, XCircle, ArrowRight, RotateCcw, Lock, Sparkles } from 'lucide-react';
import { LESSON_BY_ID, LESSONS, PASS_RATIO, nodeStates, UNITS } from '../../lib/lessons';
import { buildLessonSteps, type LessonStep, type QuizQuestion } from '../../lib/quiz';
import { BY_ID, CORE } from '../../lib/data';
import { shuffle, seeded, hashString } from '../../lib/random';
import { useProgress, useStore } from '../../app/store';
import { useDocumentTitle, useReducedMotion, useSpeech } from '../../hooks/media';
import { Mascot, type Mood } from '../../components/Mascot';
import { ProgressBar, EmptyState, CategoryBadge } from '../../components/ui';
import { QuestionPrompt, optionClass, type OptionState } from '../../components/QuestionPrompt';
import { fireConfetti, useCountUp } from '../../components/Celebrate';
import ClickSpark, { type ClickSparkHandle } from '../../components/ui/ClickSpark';

interface Outcome { key: string; recordId: string; correct: boolean; xp: number }

const PRAISE = ['Hebat!', 'Tepat sekali!', 'Bagus, teruskan!', 'Kamu semakin mahir!'];
const COMFORT = ['Hampir tepat!', 'Tak apa, cuba fahami sekali lagi.', 'Jom belajar daripada kesilapan ini.'];

export default function LessonPage() {
  const { id } = useParams();
  const lesson = id ? LESSON_BY_ID.get(id) : undefined;
  const done = useProgress((s) => s.lessonsDone);
  useDocumentTitle(lesson ? lesson.title : 'Pelajaran');
  if (!lesson) {
    return <EmptyState art={<Mascot mood="think" className="size-24" />} title="Pelajaran ini tidak ditemui" action={<Link to="/" className="btn btn-primary">Kembali ke laluan</Link>} />;
  }
  if (nodeStates(done).get(lesson.id) === 'locked') {
    const current = LESSONS.find((l) => nodeStates(done).get(l.id) === 'current');
    return (
      <EmptyState art={<span className="grid size-20 place-items-center rounded-full bg-line text-ink-subtle"><Lock className="size-9" aria-hidden /></span>} title="Pelajaran ini masih dikunci" action={current && <Link to={`/pelajaran/${current.id}`} className="btn btn-primary">Ke pelajaran semasa</Link>}>
        Selesaikan pelajaran sebelumnya dahulu untuk membuka pelajaran ini.
      </EmptyState>
    );
  }
  return <Run key={lesson.id} lessonId={lesson.id} />;
}

function Run({ lessonId }: { lessonId: string }) {
  const lesson = LESSON_BY_ID.get(lessonId)!;
  const store = useStore();
  const navigate = useNavigate();
  const [runId, setRunId] = useState(() => `${lessonId}-${Date.now()}`);
  const steps = useMemo(() => buildLessonSteps(lesson.sayings, { byId: BY_ID, pool: CORE }, runId), [lesson, runId]);
  const [i, setI] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [finished, setFinished] = useState<null | { passed: boolean; gained: number; firstPass: boolean }>(null);
  const firstPass = !store.getState().lessonsDone[lessonId];
  const step = steps[i];
  const scored = steps.filter((s) => s.kind !== 'teach').length;

  const record = useCallback((o: Outcome) => setOutcomes((prev) => (prev.some((p) => p.key === o.key) ? prev : [...prev, o])), []);

  const next = useCallback(() => {
    if (i + 1 < steps.length) { setI(i + 1); return; }
    const correct = outcomesRef.current.filter((o) => o.correct).length;
    const res = store.completeLesson({ runId, lessonId, title: lesson.title, correct, total: scored, passRatio: PASS_RATIO });
    setFinished({ ...res, firstPass });
    if (res.passed) fireConfetti();
  }, [i, steps.length, store, runId, lessonId, lesson.title, scored, firstPass]);
  const outcomesRef = useRef(outcomes);
  outcomesRef.current = outcomes;

  if (finished) {
    return (
      <Results
        lessonId={lessonId}
        outcomes={outcomes}
        total={scored}
        passed={finished.passed}
        bonus={finished.gained}
        onRetry={() => { setRunId(`${lessonId}-${Date.now()}`); setI(0); setOutcomes([]); setFinished(null); }}
        onHome={() => navigate('/', { state: finished.passed && finished.firstPass ? { justCompleted: lessonId } : undefined })}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[680px] page-enter">
      <div className="flex items-center gap-3">
        <Link to="/" className="grid size-11 shrink-0 place-items-center rounded-full text-ink-subtle hover:bg-surface-sunk" aria-label="Keluar dari pelajaran"><X className="size-6" strokeWidth={2.6} aria-hidden /></Link>
        <ProgressBar value={i} max={steps.length} label="Kemajuan pelajaran" className="h-4 flex-1" />
        <span className="tnum shrink-0 text-[0.875rem] font-[850] text-ink-muted">{i + 1}/{steps.length}</span>
      </div>
      <div key={i} className="page-enter">
        {step.kind === 'teach' && <Teach step={step} index={lesson.sayings.indexOf(step.record)} count={lesson.sayings.length} onNext={next} />}
        {step.kind === 'question' && <Question q={step.q} runId={runId} onRecord={record} onNext={next} />}
        {step.kind === 'match' && <Match step={step} runId={runId} onRecord={record} onNext={next} />}
      </div>
    </div>
  );
}

function Teach({ step, index, count, onNext }: { step: Extract<LessonStep, { kind: 'teach' }>; index: number; count: number; onNext: () => void }) {
  const r = step.record;
  const speech = useSpeech();
  return (
    <div className="mt-6">
      <div className="flex items-end gap-3">
        <Mascot mood={index === 0 ? 'wave' : 'read'} idle className="size-24 shrink-0 sm:size-28" />
        <p className="relative mb-6 rounded-[16px] border-2 border-line bg-surface px-4 py-3 text-[1rem] font-[750] shadow-[0_3px_0_var(--color-line)]">
          {index === 0 ? 'Jom kenali peribahasa baharu!' : `Peribahasa baharu ${index + 1} daripada ${count}.`}
        </p>
      </div>
      <article className="card mt-2 border-b-4 p-6">
        <CategoryBadge r={r} />
        <h1 className="saying mt-3 text-[2rem] leading-tight sm:text-[2.375rem]">{r.peribahasa}</h1>
        <p className="mt-3 text-[1.125rem] font-[700] leading-relaxed">{r.maksud}</p>
        {r.contohAyat[0] && <p className="mt-4 rounded-[14px] bg-surface-sunk p-4 text-[0.98rem] leading-relaxed">“{r.contohAyat[0].text}”</p>}
        {r.bilaSesuai && <p className="mt-3 text-[0.9375rem] text-ink-muted"><span className="font-[800] text-ink">Bila digunakan: </span>{r.bilaSesuai}</p>}
        {speech.supported && (
          <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={() => speech.speak(`${r.peribahasa}. ${r.maksud}`)}>
            <Volume2 className="size-4" aria-hidden />Dengar
          </button>
        )}
      </article>
      <button type="button" className="btn btn-primary mt-6 w-full" onClick={onNext} autoFocus>Faham, teruskan <ArrowRight className="size-5" aria-hidden /></button>
    </div>
  );
}

function Question({ q, runId, onRecord, onNext }: { q: QuizQuestion; runId: string; onRecord: (o: Outcome) => void; onNext: () => void }) {
  const store = useStore();
  const [sel, setSel] = useState<number | null>(null);
  const [checked, setChecked] = useState<null | { correct: boolean; xp: number }>(null);
  const spark = useRef<ClickSparkHandle>(null);

  const check = useCallback(() => {
    if (sel === null || checked) return;
    const correct = sel === q.correctIndex;
    const xp = store.answerQuiz({ sessionId: runId, questionKey: q.key, mode: q.mode, recordId: q.recordId, correct });
    setChecked({ correct, xp });
    onRecord({ key: q.key, recordId: q.recordId, correct, xp });
    if (correct) spark.current?.spark();
  }, [sel, checked, q, store, runId, onRecord]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const n = ['1', '2', '3', '4'].indexOf(e.key);
      if (!checked && n >= 0 && n < q.options.length) setSel(n);
      if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') { e.preventDefault(); if (checked) onNext(); else check(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [checked, check, onNext, q.options.length]);

  return (
    <div className="pb-44">
      <QuestionPrompt q={q} />
      <ClickSpark ref={spark} manual sparkColor={['#58CC02', '#FFC800', '#1CB0F6']} sparkCount={14} sparkRadius={50} className="!h-auto">
        <ol className="mt-6 space-y-3" aria-label="Pilihan jawapan">
          {q.options.map((o, idx) => {
            const state: OptionState = !checked ? (sel === idx ? 'selected' : 'idle') : idx === q.correctIndex ? 'correct' : idx === sel ? 'wrong' : 'dim';
            return (
              <li key={idx}>
                <button type="button" disabled={!!checked} aria-pressed={sel === idx} onClick={() => setSel(idx)} className={`flex min-h-14 w-full items-center gap-3 rounded-[16px] border-2 px-4 py-3 text-left font-[700] transition-[background-color,border-color,transform] duration-150 active:translate-y-[3px] ${optionClass(state)}`}>
                  <span className="tnum grid size-8 shrink-0 place-items-center rounded-[10px] border-2 border-current text-[0.875rem] font-[900] opacity-70">{idx + 1}</span>
                  <span className={q.mode === 'maksud' || q.mode === 'kosong' ? '' : 'saying text-[1.0625rem] font-[560]'}>{o.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </ClickSpark>
      <FeedbackBar
        state={checked ? (checked.correct ? 'correct' : 'wrong') : 'idle'}
        canCheck={sel !== null}
        onCheck={check}
        onNext={onNext}
        xp={checked?.xp ?? 0}
        answer={checked && !checked.correct ? q.options[q.correctIndex].label : null}
        explanation={q.explanation}
      />
    </div>
  );
}

/** The kit-style bottom bar: "Semak" while answering, then a green or red verdict with Bayu. */
function FeedbackBar({ state, canCheck, onCheck, onNext, xp, answer, explanation }: { state: 'idle' | 'correct' | 'wrong'; canCheck: boolean; onCheck: () => void; onNext: () => void; xp: number; answer: string | null; explanation: string }) {
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (state !== 'idle') nextRef.current?.focus(); }, [state]);
  const mood: Mood = state === 'correct' ? 'cheer' : 'encourage';
  const message = useMemo(() => (state === 'correct' ? PRAISE : COMFORT)[Math.floor(Math.random() * 3)], [state]);
  return (
    <div className={`fixed inset-x-0 bottom-0 z-40 border-t-2 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 transition-colors duration-200 lg:left-[248px] ${state === 'correct' ? 'border-primary bg-mint-soft' : state === 'wrong' ? 'border-coral bg-coral-soft' : 'border-line bg-paper'}`}>
      <div className="mx-auto flex max-w-[680px] flex-col gap-3 px-4 sm:flex-row sm:items-end">
        {state !== 'idle' && (
          <div role="status" className="rise-in flex min-w-0 flex-1 items-start gap-3">
            <Mascot mood={mood} className={`size-16 shrink-0 ${state === 'correct' ? 'hop' : 'wiggle'}`} />
            <div className="min-w-0">
              <p className={`flex items-center gap-2 text-[1.25rem] font-[900] ${state === 'correct' ? 'text-mint' : 'text-coral'}`}>
                {state === 'correct' ? <CheckCircle2 className="size-6" aria-hidden /> : <XCircle className="size-6" aria-hidden />}
                {message}
                {xp > 0 && <span className="rounded-full bg-sun px-2.5 py-0.5 text-[0.8125rem] text-ink">+{xp} XP</span>}
              </p>
              {answer && <p className="mt-1 text-[0.9375rem] font-[800] text-coral">Jawapan: <span className="saying font-[560]">{answer}</span></p>}
              <p className="mt-1 line-clamp-3 text-[0.9rem] font-[600] text-ink">{explanation}</p>
            </div>
          </div>
        )}
        {state === 'idle' ? (
          <button type="button" className="btn btn-primary w-full sm:ml-auto sm:w-48" disabled={!canCheck} onClick={onCheck}>Semak</button>
        ) : (
          <button ref={nextRef} type="button" className="btn btn-primary w-full shrink-0 sm:w-48" onClick={onNext}>Teruskan</button>
        )}
      </div>
    </div>
  );
}

function Match({ step, runId, onRecord, onNext }: { step: Extract<LessonStep, { kind: 'match' }>; runId: string; onRecord: (o: Outcome) => void; onNext: () => void }) {
  const store = useStore();
  const rights = useMemo(() => shuffle(step.pairs, seeded(hashString(runId + step.key))), [step, runId]);
  const [left, setLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<{ l: string; r: string } | null>(null);
  const missed = useRef(new Set<string>());
  const all = matched.length === step.pairs.length;

  function pickRight(id: string) {
    if (!left || matched.includes(id)) return;
    const ok = left === id;
    if (ok) {
      setMatched((m) => [...m, id]);
      const firstTry = !missed.current.has(id);
      store.answerQuiz({ sessionId: runId, questionKey: `padan:${id}`, mode: 'maksud', recordId: id, correct: firstTry });
    } else {
      missed.current.add(left);
      setWrong({ l: left, r: id });
      window.setTimeout(() => setWrong(null), 520);
    }
    setLeft(null);
  }

  useEffect(() => {
    if (all) onRecord({ key: step.key, recordId: step.pairs[0].id, correct: missed.current.size <= 1, xp: 0 });
  }, [all, onRecord, step]);

  const cls = (id: string, side: 'l' | 'r') =>
    matched.includes(id) ? 'border-mint-bright bg-mint-soft text-mint opacity-70 shadow-[0_3px_0_var(--color-primary-edge)]'
      : wrong && wrong[side] === id ? 'shake border-coral bg-coral-soft text-coral'
        : side === 'l' && left === id ? 'border-sky bg-sky-soft text-sky-ink shadow-[0_4px_0_var(--color-sky-edge)]'
          : 'border-line-strong bg-surface shadow-[0_4px_0_var(--color-line-strong)] hover:bg-sky-soft/50';

  return (
    <div className="pb-36">
      <h1 className="mt-6 text-[1.5rem] font-[900]">Padankan peribahasa dengan maksudnya</h1>
      <p className="mt-1 font-[650] text-ink-muted">Ketik peribahasa, kemudian ketik maksudnya.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <ul className="space-y-3" aria-label="Peribahasa">
          {step.pairs.map((p) => (
            <li key={p.id}>
              <button type="button" disabled={matched.includes(p.id)} aria-pressed={left === p.id} onClick={() => setLeft(p.id)} className={`saying flex min-h-[88px] w-full items-center rounded-[14px] border-2 p-3 text-left text-[0.98rem] leading-snug transition-[background-color,border-color] duration-150 active:translate-y-[3px] ${cls(p.id, 'l')}`}>{p.left}</button>
            </li>
          ))}
        </ul>
        <ul className="space-y-3" aria-label="Maksud">
          {rights.map((p) => (
            <li key={p.id}>
              <button type="button" disabled={matched.includes(p.id) || !left} onClick={() => pickRight(p.id)} className={`flex min-h-[88px] w-full items-center rounded-[14px] border-2 p-3 text-left text-[0.875rem] font-[700] leading-snug transition-[background-color,border-color] duration-150 active:translate-y-[3px] ${cls(p.id, 'r')}`}>{p.right}</button>
            </li>
          ))}
        </ul>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-paper pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 lg:left-[248px]">
        <div className="mx-auto flex max-w-[680px] items-center gap-3 px-4">
          <p className="flex-1 text-[0.9375rem] font-[750] text-ink-muted" role="status">{all ? (missed.current.size <= 1 ? 'Semua padanan betul!' : 'Selesai! Ada beberapa padanan yang perlu diulang kaji.') : `${matched.length}/${step.pairs.length} dipadankan`}</p>
          <button type="button" className="btn btn-primary w-40" disabled={!all} onClick={onNext}>Teruskan</button>
        </div>
      </div>
    </div>
  );
}

function Results({ lessonId, outcomes, total, passed, bonus, onRetry, onHome }: { lessonId: string; outcomes: Outcome[]; total: number; passed: boolean; bonus: number; onRetry: () => void; onHome: () => void }) {
  const scope = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const done = useProgress((s) => s.lessonsDone);
  const correct = outcomes.filter((o) => o.correct).length;
  const xp = outcomes.reduce((n, o) => n + o.xp, 0) + bonus;
  const shownXp = useCountUp(xp, 900);
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const nextLesson = LESSONS.find((l) => !done[l.id] && l.id !== lessonId);
  const unit = UNITS.find((u) => u.lessons.some((l) => l.id === lessonId))!;
  const wrongIds = [...new Set(outcomes.filter((o) => !o.correct).map((o) => o.recordId))];

  useGSAP(() => {
    if (reduced) return;
    gsap.timeline()
      .from('.r-mascot', { y: 40, scale: 0.8, opacity: 0, duration: 0.6, ease: 'back.out(1.8)' })
      .from('.r-title', { y: 14, opacity: 0, duration: 0.35 }, '-=0.25')
      .from('.r-stat', { y: 18, opacity: 0, duration: 0.4, stagger: 0.08, ease: 'back.out(1.6)' }, '-=0.1');
  }, { scope, dependencies: [reduced] });

  return (
    <div ref={scope} className="mx-auto flex max-w-[560px] flex-col items-center pt-4 text-center">
      <Mascot mood={passed ? 'cheer' : 'encourage'} idle className="r-mascot size-40" label={passed ? 'Bayu bersorak' : 'Bayu memberi semangat'} />
      <h1 className="r-title mt-2 text-[2rem] font-[900] text-primary-ink">{passed ? 'Pelajaran selesai!' : correct / Math.max(1, total) >= 0.4 ? 'Hampir berjaya!' : 'Jom cuba lagi!'}</h1>
      <p className="r-title mt-1 font-[700] text-ink-muted">{passed ? `${unit.title} semakin dikuasai.` : `Perlukan ${Math.ceil(total * PASS_RATIO)} jawapan betul untuk lulus. Jom cuba sekali lagi.`}</p>
      <dl className="mt-6 grid w-full grid-cols-3 gap-3">
        <div className="r-stat rounded-[16px] border-2 border-sun-edge bg-sun p-1 shadow-[0_4px_0_var(--color-sun-edge)]">
          <dt className="py-1 text-[0.8125rem] font-[900] text-ink">Jumlah XP</dt>
          <dd className="tnum m-0 flex items-center justify-center gap-1 rounded-[12px] bg-surface py-3 text-[1.5rem] font-[900] text-sun-ink"><Sparkles className="size-5" aria-hidden />{shownXp}</dd>
        </div>
        <div className="r-stat rounded-[16px] border-2 border-primary-edge bg-primary p-1 shadow-[0_4px_0_var(--color-primary-edge)]">
          <dt className="py-1 text-[0.8125rem] font-[900] text-on-primary">Ketepatan</dt>
          <dd className="tnum m-0 rounded-[12px] bg-surface py-3 text-[1.5rem] font-[900] text-primary-ink">{accuracy}%</dd>
        </div>
        <div className="r-stat rounded-[16px] border-2 border-sky-edge bg-sky p-1 shadow-[0_4px_0_var(--color-sky-edge)]">
          <dt className="py-1 text-[0.8125rem] font-[900] text-on-sky">Betul</dt>
          <dd className="tnum m-0 rounded-[12px] bg-surface py-3 text-[1.5rem] font-[900] text-sky-ink">{correct}/{total}</dd>
        </div>
      </dl>
      {bonus > 0 && <p className="r-stat mt-3 text-[0.9375rem] font-[800] text-sun-ink">Termasuk bonus +{bonus} XP kerana lulus pelajaran ini buat kali pertama.</p>}
      {wrongIds.length > 0 && (
        <div className="r-stat mt-6 w-full rounded-[var(--radius-lg)] border-2 border-line bg-surface p-4 text-left">
          <p className="font-[850]">Perlu diulang kaji</p>
          <ul className="mt-2 space-y-1.5">{wrongIds.map((id) => <li key={id}><Link to={`/peribahasa/${id}`} className="saying text-[1.0625rem] text-sky-ink">{BY_ID.get(id)?.peribahasa}</Link></li>)}</ul>
          <p className="mt-2 text-[0.8125rem] font-[650] text-ink-muted">Peribahasa ini juga muncul dalam Simpanan, di bahagian kesilapan.</p>
        </div>
      )}
      <div className="mt-8 flex w-full flex-col gap-3">
        {passed && nextLesson ? (
          <Link to={`/pelajaran/${nextLesson.id}`} className="btn btn-primary w-full">Teruskan: {nextLesson.title} <ArrowRight className="size-5" aria-hidden /></Link>
        ) : !passed ? (
          <button type="button" className="btn btn-primary w-full" onClick={onRetry}><RotateCcw className="size-5" aria-hidden />Cuba lagi</button>
        ) : null}
        <button type="button" className="btn btn-secondary w-full" onClick={onHome}>Kembali ke Laluan</button>
      </div>
    </div>
  );
}
