import { useEffect, useRef, useState } from 'react';

// Confetti for real milestones only (lesson passed, daily solved, achievement). One canvas,
// ~1.6s, no library. Skipped entirely under prefers-reduced-motion.
const EVENT = 'lestari:confetti';
const COLORS = ['#58CC02', '#FFC800', '#1CB0F6', '#FF6B6B', '#CE82FF', '#FF8A3D'];

export function fireConfetti() {
  window.dispatchEvent(new Event(EVENT));
}

export function ConfettiLayer() {
  const ref = useRef<HTMLCanvasElement>(null);
  // The canvas only exists on screen while confetti is falling, so it never sits over the page.
  const [active, setActive] = useState(false);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    type P = { x: number; y: number; vx: number; vy: number; r: number; vr: number; w: number; h: number; c: string };
    let parts: P[] = [];
    let start = 0;
    const frame = (t: number) => {
      if (!start) start = t;
      const dt = 1 / 60;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        p.vy += 900 * dt;
        p.vx *= 0.99;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - (t - start) / 1700);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t - start < 1700) raf = requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, canvas.width, canvas.height); parts = []; start = 0; raf = 0; setActive(false); }
    };
    const fire = () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setActive(true);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = window.innerWidth;
      parts = Array.from({ length: 140 }, (_, i) => {
        const fromLeft = i % 2 === 0;
        return {
          x: fromLeft ? w * 0.15 : w * 0.85,
          y: window.innerHeight * 0.55,
          vx: (fromLeft ? 1 : -1) * (180 + Math.random() * 420),
          vy: -(520 + Math.random() * 520),
          r: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 12,
          w: 6 + Math.random() * 6,
          h: 9 + Math.random() * 8,
          c: COLORS[i % COLORS.length],
        };
      });
      start = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    window.addEventListener(EVENT, fire);
    return () => { window.removeEventListener(EVENT, fire); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} aria-hidden className={`pointer-events-none fixed inset-0 z-[80] size-full ${active ? '' : 'hidden'}`} />;
}

/** Counts from the previous value to the new one (ease-out, 700ms). Instant under reduced motion. */
export function useCountUp(value: number, duration = 700): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = value;
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = value; };
  }, [value, duration]);
  return shown;
}
