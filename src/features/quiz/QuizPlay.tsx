import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { X, Check, ArrowRight, Timer, RotateCcw, BookmarkPlus, CheckCircle2, XCircle } from 'lucide-react';
import { buildQuiz, meaningQuestion, type QuizQuestion } from '../../lib/quiz';
import { QuestionPrompt, optionClass, type OptionState } from '../../components/QuestionPrompt';
import { fireConfetti } from '../../components/Celebrate';
import { mistakeIds } from '../../lib/progress';
import { seeded, hashString } from '../../lib/random';
import { BY_ID, CORE } from '../../lib/data';
import { MODE_LABEL, type QuizMode } from '../../lib/progress';
import { useProgress, useStore } from '../../app/store';
import { useCountdown, useDocumentTitle, useReducedMotion } from '../../hooks/media';
import { ProgressBar, EmptyState } from '../../components/ui';
import ClickSpark, { type ClickSparkHandle } from '../../components/ui/ClickSpark';
import { Mascot } from '../../components/Mascot';

type PlayMode = QuizMode;
const MODES: PlayMode[] = ['maksud', 'emoji', 'kosong', 'konteks'];

interface Answer { picked: number; correct: boolean; timedOut: boolean; xp: number }

const PRAISE = ['Bagus! Kamu semakin memahami konteksnya.', 'Tepat sekali!', 'Hebat, teruskan!'];

export default function QuizPlay() {
  const { mode } = useParams();
  if (!MODES.includes(mode as PlayMode)) {
    return <EmptyState art={<Mascot mood="think" className="size-20" />} title="Mod kuiz ini tidak wujud" action={<Link to="/kuiz" className="btn btn-primary">Pilih kuiz</Link>} />;
  }
  return <Session key={mode} mode={mode as PlayMode} />;
}

function Session({ mode }: { mode: PlayMode }) {
  useDocumentTitle(MODE_LABEL[mode]);
  const store = useStore();
  const timerOn = useProgress((s) => s.settings.timer) && mode === 'kosong';
  const [sessionId, setSessionId] = useState(() => `${mode}-${Date.now()}`);
  const [params] = useSearchParams();
  const fromMistakes = params.get('dari') === 'kesilapan' && mode === 'maksud';
  const questions = useMemo(() => {
    if (fromMistakes) {
      const rand = seeded(hashString(sessionId));
      const ids = mistakeIds(store.getState()).slice(0, 8);
      const qs = ids.map((id) => BY_ID.get(id)).filter((r): r is NonNullable<typeof r> => !!r).map((r) => meaningQuestion(r, CORE, rand));
      if (qs.length) return qs;
    }
    return buildQuiz(mode, { byId: BY_ID, pool: CORE }, sessionId);
  }, [mode, sessionId, fromMistakes, store]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [done, setDone] = useState(false);
  const spark = useRef<ClickSparkHandle>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const q = questions[index];
  const answered = q ? answers[q.key] : undefined;

  const answer = useCallback((picked: number, timedOut = false) => {
    if (!q || answers[q.key]) return; // never score the same question twice
    const correct = !timedOut && picked === q.correctIndex;
    const xp = store.answerQuiz({ sessionId, questionKey: q.key, mode, recordId: q.recordId, correct });
    setAnswers((a) => ({ ...a, [q.key]: { picked, correct, timedOut, xp } }));
    if (correct) spark.current?.spark();
    window.setTimeout(() => nextRef.current?.focus(), 30);
  }, [q, answers, store, sessionId, mode]);

  const secondsLeft = useCountdown(15, timerOn && !!q && !answered && !done, q?.key ?? 'none', () => answer(-1, true));

  const finish = useCallback(() => {
    const list = Object.values(answers);
    store.completeQuiz({
      id: sessionId,
      mode,
      correct: list.filter((a) => a.correct).length,
      total: questions.length,
      xp: list.reduce((n, a) => n + a.xp, 0),
      wrongIds: questions.filter((x) => answers[x.key] && !answers[x.key].correct).map((x) => x.recordId),
    });
    setDone(true);
  }, [answers, store, sessionId, mode, questions]);

  const next = useCallback(() => {
    if (index + 1 < questions.length) setIndex(index + 1);
    else finish();
  }, [index, questions.length, finish]);

  // Keyboard: A-D or 1-4 to answer, Enter to continue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !q || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      const idx = ['a', 'b', 'c', 'd'].indexOf(k) >= 0 ? ['a', 'b', 'c', 'd'].indexOf(k) : ['1', '2', '3', '4'].indexOf(k);
      if (!answered && idx >= 0 && idx < q.options.length) { e.preventDefault(); answer(idx); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, answered, done, answer]);

  const restart = () => { setSessionId(`${mode}-${Date.now()}`); setIndex(0); setAnswers({}); setDone(false); };

  if (!questions.length) return <EmptyState title="Soalan tidak dapat dijana" action={<Link to="/kuiz" className="btn btn-primary">Kembali</Link>} />;
  if (done) return <Results mode={mode} questions={questions} answers={answers} onRestart={restart} />;

  const correctCount = Object.values(answers).filter((a) => a.correct).length;

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="flex items-center gap-3">
        <Link to="/kuiz" className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-surface-sunk" aria-label="Keluar dari kuiz"><X className="size-5" aria-hidden /></Link>
        <ProgressBar value={index + (answered ? 1 : 0)} max={questions.length} label="Kemajuan kuiz" tone="violet" className="flex-1" />
        <span className="tnum shrink-0 text-[0.875rem] font-[700] text-ink-muted">{index + 1}/{questions.length}</span>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[0.875rem] font-[650] text-ink-muted">{MODE_LABEL[mode]}<span className="rounded-full bg-surface-sunk px-2 py-0.5 text-[0.75rem]">{q.difficulty === 1 ? 'Mudah' : q.difficulty === 2 ? 'Sederhana' : 'Mencabar'}</span></p>
        {timerOn && (
          <span role="timer" aria-live={secondsLeft <= 5 ? 'assertive' : 'off'} className={`tnum inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.875rem] font-[700] ${answered ? 'bg-surface-sunk text-ink-muted' : secondsLeft <= 5 ? 'bg-coral-soft text-coral' : 'bg-sun-soft text-sun-ink'}`}>
            <Timer className="size-4" aria-hidden />{answered ? 'Berhenti' : `${secondsLeft} s`}
          </span>
        )}
      </div>

      <QuestionPrompt q={q} />

      <ClickSpark ref={spark} manual sparkColor={['#2BB673', '#FFC845', '#5B3FD8']} sparkCount={14} sparkRadius={46} className="!h-auto">
        <ol className="mt-6 space-y-2.5" aria-label="Pilihan jawapan">
          {q.options.map((o, i) => {
            const state = !answered ? 'idle' : i === q.correctIndex ? 'correct' : i === answered.picked ? 'wrong' : 'dim';
            return (
              <li key={`${q.key}-${i}`}>
                <button
                  type="button"
                  onClick={() => answer(i)}
                  disabled={!!answered}
                  aria-describedby={answered ? 'maklum-balas' : undefined}
                  className={`group flex min-h-14 w-full items-center gap-3 rounded-[16px] border-2 px-4 py-3 text-left font-[700] transition-[background-color,border-color,transform,opacity] duration-150 active:translate-y-[3px] ${optionClass(state as OptionState)}`}
                >
                  <span className={`tnum grid size-8 shrink-0 place-items-center rounded-[10px] text-[0.875rem] font-[750] ${state === 'correct' ? 'bg-mint text-on-primary' : state === 'wrong' ? 'bg-coral text-on-primary' : 'bg-surface-sunk text-ink-muted group-hover:text-primary-ink'}`}>
                    {state === 'correct' ? <Check className="size-4" aria-hidden /> : state === 'wrong' ? <X className="size-4" aria-hidden /> : String.fromCharCode(65 + i)}
                  </span>
                  <span className={mode === 'kosong' || mode === 'maksud' ? 'text-[1rem]' : 'saying text-[1.0625rem] font-[560]'}>{o.label}</span>
                  {state === 'correct' && <span className="sr-only">(jawapan betul)</span>}
                  {state === 'wrong' && <span className="sr-only">(pilihan kamu, salah)</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </ClickSpark>

      {answered && (
        <div id="maklum-balas" role="status" className={`rise-in mt-5 rounded-[var(--radius-lg)] p-5 ${answered.correct ? 'bg-mint-soft' : 'bg-coral-soft'}`}>
          <div className="flex items-start gap-3">
          <Mascot mood={answered.correct ? 'cheer' : 'encourage'} className={`size-16 shrink-0 ${answered.correct ? 'hop' : 'wiggle'}`} />
          <div className="min-w-0 flex-1">
          <p className={`flex flex-wrap items-center gap-2 text-[1.125rem] font-[900] ${answered.correct ? 'text-mint' : 'text-coral'}`}>
            {answered.correct ? <CheckCircle2 className="size-5" aria-hidden /> : <XCircle className="size-5" aria-hidden />}
            {answered.correct ? PRAISE[correctCount % PRAISE.length] : answered.timedOut ? 'Masa tamat. Jom fahami jawapannya.' : 'Hampir tepat! Cuba fahami maksudnya sekali lagi.'}
            {answered.xp > 0 && <span className="ml-auto rounded-full bg-sun px-2.5 py-0.5 text-[0.8125rem] text-ink">+{answered.xp} XP</span>}
          </p>
          {!answered.correct && <p className="mt-2"><span className="font-[650]">Jawapan: </span><span className="saying">{q.options[q.correctIndex].label}</span></p>}
          <p className="mt-2 font-[600] leading-relaxed text-ink">{q.explanation}</p>
          </div>
          </div>
          {answered.correct && answered.xp === 0 && <p className="mt-2 text-[0.8125rem] text-ink-muted">XP untuk peribahasa ini sudah diberi hari ini; jawapan kamu tetap dikira untuk penguasaan.</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button ref={nextRef} type="button" className="btn btn-primary" onClick={next}>
              {index + 1 < questions.length ? 'Soalan seterusnya' : 'Lihat keputusan'} <ArrowRight className="size-5" aria-hidden />
            </button>
            <Link to={`/peribahasa/${q.recordId}`} className="btn btn-quiet">Baca perincian</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Results({ mode, questions, answers, onRestart }: { mode: PlayMode; questions: QuizQuestion[]; answers: Record<string, Answer>; onRestart: () => void }) {
  const store = useStore();
  const scope = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [saved, setSaved] = useState(false);
  const list = Object.values(answers);
  const correct = list.filter((a) => a.correct).length;
  const xp = useProgress((s) => s.quizHistory[0]?.xp ?? 0);
  const wrong = questions.filter((q) => answers[q.key] && !answers[q.key].correct);
  const ratio = correct / questions.length;
  useEffect(() => { if (ratio >= 0.875) fireConfetti(); }, [ratio]);

  useGSAP(() => {
    if (reduced) return;
    const counter = { n: 0 };
    const el = scope.current?.querySelector('.res-score');
    gsap.timeline()
      .from('.res-mascot', { y: 20, scale: 0.9, opacity: 0, duration: 0.5, ease: 'back.out(1.8)' })
      .to(counter, { n: correct, duration: 0.6, ease: 'power2.out', onUpdate: () => { if (el) el.textContent = String(Math.round(counter.n)); } }, '-=0.2')
      .from('.res-row', { y: 10, opacity: 0, duration: 0.3, stagger: 0.05 }, '-=0.3');
  }, { scope, dependencies: [reduced] });

  return (
    <div ref={scope} className="mx-auto max-w-[720px]">
      <div className="flex flex-col items-center text-center">
        <Mascot mood={ratio >= 0.75 ? 'cheer' : ratio >= 0.4 ? 'happy' : 'think'} className="res-mascot size-32" />
        <h1 className="mt-3 text-[1.75rem] font-[740] tracking-[-0.025em]">{ratio >= 0.75 ? 'Cemerlang!' : ratio >= 0.4 ? 'Usaha yang baik!' : 'Jom cuba satu lagi pusingan.'}</h1>
        <p className="tnum mt-2 font-display text-[3rem] font-[760] leading-none"><span className="res-score">{correct}</span><span className="text-[1.5rem] text-ink-muted"> / {questions.length}</span></p>
        <p className="mt-2 text-ink-muted">{MODE_LABEL[mode]}</p>
        <p className="mt-1 rounded-full bg-sun px-3 py-0.5 text-[0.875rem] font-[700]">+{xp} XP</p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" className="btn btn-primary" onClick={onRestart}><RotateCcw className="size-5" aria-hidden />Main lagi</button>
        <Link to="/kuiz" className="btn btn-secondary">Kuiz lain</Link>
      </div>

      {wrong.length > 0 ? (
        <section aria-labelledby="semak" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="semak" className="text-[1.25rem] font-[700]">Semak jawapan yang salah</h2>
            <button type="button" className="btn btn-secondary btn-sm" disabled={saved} onClick={() => { store.addToRevision(wrong.map((q) => q.recordId)); setSaved(true); }}>
              {saved ? <Check className="size-4 text-mint" aria-hidden /> : <BookmarkPlus className="size-4" aria-hidden />}
              {saved ? 'Ditambah ke kad imbas' : 'Simpan untuk ulang kaji'}
            </button>
          </div>
          <ul className="mt-3 space-y-3">
            {wrong.map((q) => {
              const r = BY_ID.get(q.recordId)!;
              const a = answers[q.key];
              return (
                <li key={q.key} className="res-row card p-4 sm:p-5">
                  <p className="text-[0.875rem] text-ink-muted">{q.mode === 'emoji' ? <span className="text-[1.25rem]" role="img" aria-label={q.promptLabel}>{q.prompt}</span> : q.prompt}</p>
                  {a.picked >= 0 && <p className="mt-2 text-[0.9rem] text-coral"><span className="font-[650]">Pilihan kamu: </span>{q.options[a.picked].label}</p>}
                  {a.timedOut && <p className="mt-2 text-[0.9rem] text-coral">Masa tamat</p>}
                  <Link to={`/peribahasa/${r.id}`} className="saying mt-1 block text-[1.125rem] no-underline hover:underline">{r.peribahasa}</Link>
                  <p className="mt-0.5 text-[0.9rem] text-ink-muted">{q.explanation}</p>
                </li>
              );
            })}
          </ul>
          {saved && <p className="mt-3 text-[0.875rem] text-mint" role="status">Peribahasa ini akan muncul dahulu dalam sesi kad imbas kamu.</p>}
        </section>
      ) : (
        <p className="res-row mt-10 rounded-[var(--radius-lg)] bg-mint-soft p-5 text-center font-[650] text-mint">Semua jawapan betul. Kamu boleh cuba mod lain untuk cabaran baharu.</p>
      )}
    </div>
  );
}
