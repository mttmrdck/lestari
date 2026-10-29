import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { createStore, type ProgressState, type ProgressStore } from '../lib/progress';

function safeStorage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = '__lestari_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export const store: ProgressStore = createStore(typeof window === 'undefined' ? null : safeStorage());

const StoreContext = createContext<ProgressStore>(store);

export function StoreProvider({ children, value = store }: { children: ReactNode; value?: ProgressStore }) {
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): ProgressStore {
  return useContext(StoreContext);
}

/** Subscribe to the progress state. Selectors should return stable values (state slices or primitives). */
export function useProgress<T>(selector: (s: ProgressState) => T): T {
  const s = useStore();
  return useSyncExternalStore(s.subscribe, () => selector(s.getState()), () => selector(s.getState()));
}

export function useStorageNotice(): string | null {
  const s = useStore();
  return useSyncExternalStore(s.subscribe, s.getNotice, s.getNotice);
}
