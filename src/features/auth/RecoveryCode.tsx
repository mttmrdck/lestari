import { useState } from 'react';
import { ArrowRight, Check, Copy, Download, ShieldCheck } from 'lucide-react';

/** Shown once. Without a mail service this code is the only way back in if a password is forgotten. */
export function RecoveryCode({ code, onDone }: { code: string; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { /* the code stays on screen */ }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([`Kod pemulihan akaun LESTARI\n${code}\n`], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kod-pemulihan-lestari.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="rise-in">
      <span className="grid size-12 place-items-center rounded-[14px] bg-primary text-on-primary"><ShieldCheck className="size-6" strokeWidth={2.6} aria-hidden /></span>
      <h1 className="mt-3 text-[1.75rem] font-[900] leading-tight tracking-[-0.02em]">Simpan kod pemulihan kamu</h1>
      <p className="mt-1 text-ink-muted">Jika kamu terlupa kata laluan, kod ini sahaja boleh memulihkan akaun. Kami tidak akan menunjukkannya lagi, dan LESTARI tidak menghantar e-mel.</p>
      <p data-testid="kod-pemulihan" className="tnum mt-4 select-all break-all rounded-[var(--radius-lg)] border-2 border-dashed border-sky bg-sky-soft p-4 text-center font-[900] tracking-[0.06em] text-sky-ink [font-size:1.25rem] sm:[font-size:1.4rem]">{code}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>{copied ? <Check className="pop size-4" strokeWidth={3} aria-hidden /> : <Copy className="size-4" aria-hidden />}{copied ? 'Disalin' : 'Salin'}</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={download}><Download className="size-4" aria-hidden />Muat turun</button>
      </div>
      <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-2.5 font-[750]">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="size-5 accent-[var(--color-primary-ink)]" />Saya sudah simpan kod ini
      </label>
      <button type="button" disabled={!saved} onClick={onDone} className="btn btn-primary mt-3 min-h-[54px] w-full text-[1.0625rem]">Jom Mula <ArrowRight className="size-5" aria-hidden /></button>
    </div>
  );
}
