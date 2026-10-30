import { useSyncExternalStore } from 'react';

// Chrome fires `beforeinstallprompt` once, possibly before any screen that wants it has mounted,
// so it is captured at startup and held here.
interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallPromptEvent; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });
}

export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function useInstallPrompt() {
  const event = useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => deferred);
  return event && (async () => {
    await event.prompt();
    await event.userChoice;
    deferred = null;
    notify();
  });
}
