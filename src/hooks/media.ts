import { useEffect, useRef, useState, useSyncExternalStore, useCallback } from 'react';

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  };
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(subscribeMedia(query), () => window.matchMedia(query).matches, () => false);
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · LESTARI` : 'LESTARI · Fahami Makna. Kuasai Bahasa.';
  }, [title]);
}

// ---------- Text-to-speech ----------

export type SpeechStatus = 'idle' | 'speaking' | 'unsupported' | 'error';

function pickMalayVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /^ms(-|_)?MY/i.test(v.lang)) ??
    voices.find((v) => /^ms/i.test(v.lang)) ??
    voices.find((v) => /^id(-|_)?ID/i.test(v.lang)) ?? // Indonesian is the closest fallback
    null
  );
}

export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [status, setStatus] = useState<SpeechStatus>(supported ? 'idle' : 'unsupported');
  const [voiceNote, setVoiceNote] = useState<string | null>(null);

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  const speak = useCallback((text: string) => {
    if (!supported) { setStatus('unsupported'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickMalayVoice();
    if (voice) { u.voice = voice; u.lang = voice.lang; setVoiceNote(/^id/i.test(voice.lang) ? 'Suara Bahasa Melayu tiada pada peranti ini; suara Bahasa Indonesia digunakan.' : null); }
    else { u.lang = 'ms-MY'; setVoiceNote('Suara Bahasa Melayu tidak ditemui pada peranti ini; sebutan mungkin kurang tepat.'); }
    u.rate = 0.92;
    u.onstart = () => setStatus('speaking');
    u.onend = () => setStatus('idle');
    u.onerror = (e) => setStatus(e.error === 'interrupted' || e.error === 'canceled' ? 'idle' : 'error');
    window.speechSynthesis.speak(u);
  }, [supported]);

  const stop = useCallback(() => { if (supported) window.speechSynthesis.cancel(); setStatus('idle'); }, [supported]);
  return { supported, status, speak, stop, voiceNote };
}

// ---------- Speech recognition (optional voice input) ----------

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export function useVoiceInput(onText: (text: string) => void) {
  const Ctor: (new () => RecognitionLike) | undefined =
    typeof window === 'undefined' ? undefined : ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => RecognitionLike) | undefined;
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<RecognitionLike | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  const start = useCallback(() => {
    if (!Ctor) return;
    setError(null);
    const r = new Ctor();
    r.lang = 'ms-MY';
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results).map((res) => res[0].transcript).join(' ');
      cb.current(text);
    };
    r.onerror = (e) => {
      setError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Akses mikrofon ditolak. Benarkan mikrofon dalam tetapan pelayar, atau taip situasi kamu.'
          : e.error === 'no-speech'
            ? 'Tiada suara dikesan. Cuba lagi atau taip situasi kamu.'
            : 'Input suara tidak berjaya. Sila taip situasi kamu.',
      );
    };
    r.onend = () => setListening(false);
    rec.current = r;
    try { r.start(); setListening(true); } catch { setError('Input suara tidak dapat dimulakan.'); }
  }, [Ctor]);

  const stop = useCallback(() => { rec.current?.stop(); setListening(false); }, []);
  useEffect(() => () => rec.current?.stop(), []);
  return { supported: !!Ctor, listening, error, start, stop };
}

// ---------- Countdown timer ----------

/**
 * Counts down from `seconds` while `running`. Calls onExpire once. Restarts when `resetKey` changes.
 * Uses timestamps rather than counting ticks, so a throttled background tab cannot stretch the time.
 */
export function useCountdown(seconds: number, running: boolean, resetKey: string, onExpire: () => void) {
  const [left, setLeft] = useState(seconds);
  const deadline = useRef(0);
  const expired = useRef(false);
  const cb = useRef(onExpire);
  cb.current = onExpire;

  useEffect(() => {
    setLeft(seconds);
    expired.current = false;
    deadline.current = Date.now() + seconds * 1000;
  }, [resetKey, seconds]);

  useEffect(() => {
    if (!running) return;
    // Resume from the remaining time when restarted.
    deadline.current = Date.now() + left * 1000;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0 && !expired.current) {
        expired.current = true;
        window.clearInterval(id);
        cb.current();
      }
    }, 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, resetKey]);

  return left;
}
