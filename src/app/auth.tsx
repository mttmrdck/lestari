import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, api, type AccountUser } from '../lib/api';
import type { ProgressStore, XpClaim } from '../lib/progress';
import { useStore } from './store';

type Status = 'loading' | 'guest' | 'user';

interface AuthValue {
  status: Status;
  user: AccountUser | null;
  /** False on a static preview or offline; the app keeps working as a guest. */
  backend: boolean;
  /** Shown once after a session ends on the server. */
  notice: string | null;
  clearNotice: () => void;
  login: (b: { identifier: string; password: string; remember: boolean }) => Promise<AccountUser>;
  register: (b: { displayName: string; username: string; email: string; password: string; remember: boolean }) => Promise<{ user: AccountUser; recoveryCode: string }>;
  recover: (b: { identifier: string; recoveryCode: string; password: string }) => Promise<{ user: AccountUser; recoveryCode: string }>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth needs AuthProvider');
  return v;
}

const outboxKey = (id: string) => `lestari:outbox:${id}`;
const syncedKey = (id: string) => `lestari:selaras:${id}`;
const FLUSH_MS = 700;
const SNAPSHOT_MS = 2500;

function readList(key: string): XpClaim[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as XpClaim[]; } catch { return []; }
}
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* retried next time */ } };

/**
 * Sends a signed-in learner's actions to the XP ledger and keeps a device copy on the server.
 * Claims wait in localStorage until the server has answered, so a dropped connection loses nothing;
 * the ledger's unique keys make a retry harmless.
 */
function createSync(store: ProgressStore, userId: string, onExpired: () => void) {
  let flushTimer = 0;
  let snapTimer = 0;
  let sending = false;
  let stopped = false;

  async function flush() {
    if (stopped || sending) return;
    const queue = readList(outboxKey(userId));
    if (!queue.length) return;
    const batch = queue.slice(0, 50);
    sending = true;
    try {
      await api.claimXp(batch);
      write(outboxKey(userId), JSON.stringify(readList(outboxKey(userId)).slice(batch.length)));
      window.dispatchEvent(new Event('lestari:xp-selaras'));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onExpired();
    } finally {
      sending = false;
    }
    if (readList(outboxKey(userId)).length) flushTimer = window.setTimeout(() => void flush(), 3000);
  }

  async function snapshot() {
    if (stopped) return;
    try {
      const { updatedAt } = await api.putProgress(store.getState());
      write(syncedKey(userId), String(updatedAt));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onExpired();
    }
  }

  const offClaim = store.onClaim((c) => {
    write(outboxKey(userId), JSON.stringify([...readList(outboxKey(userId)), c]));
    window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => void flush(), FLUSH_MS);
  });
  const offState = store.subscribe(() => {
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(() => void snapshot(), SNAPSHOT_MS);
  });
  const onOnline = () => void flush();
  window.addEventListener('online', onOnline);
  void flush();

  return {
    /** Sends everything now, for logout. */
    async finish() {
      window.clearTimeout(flushTimer);
      window.clearTimeout(snapTimer);
      await flush();
      await snapshot();
      this.stop();
    },
    stop() {
      stopped = true;
      offClaim();
      offState();
      window.removeEventListener('online', onOnline);
      window.clearTimeout(flushTimer);
      window.clearTimeout(snapTimer);
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [status, setStatus] = useState<Status>(store.getAccountId() ? 'loading' : 'loading');
  const [backend, setBackend] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const sync = useRef<ReturnType<typeof createSync> | null>(null);

  const toGuest = useCallback((message?: string) => {
    sync.current?.stop();
    sync.current = null;
    store.switchAccount(null);
    setUser(null);
    setStatus('guest');
    if (message) setNotice(message);
  }, [store]);

  /** Loads the right progress for this account, then starts syncing it. */
  const attach = useCallback(async (u: AccountUser, opts: { fresh?: boolean } = {}) => {
    sync.current?.stop();
    const wasGuest = !store.getAccountId();
    let remote: { state: unknown; updatedAt: number } = { state: null, updatedAt: 0 };
    try { remote = await api.getProgress(); } catch { /* keep the local copy */ }
    const localNewer = Number(localStorage.getItem(syncedKey(u.id)) ?? 0) >= remote.updatedAt;
    if (remote.state && !(store.hasLocalCopy(u.id) && localNewer)) store.switchAccount(u.id, { state: remote.state });
    else if (!remote.state && !store.hasLocalCopy(u.id) && wasGuest) store.switchAccount(u.id, { carry: true });
    else store.switchAccount(u.id);
    if (opts.fresh || !store.getState().profile) {
      const p = store.getState().profile;
      store.setProfile({ name: p?.name ?? u.displayName, level: p?.level ?? 'menengah', dailyGoal: p?.dailyGoal ?? 50 });
    }
    setUser(u);
    setStatus('user');
    sync.current = createSync(store, u.id, () => toGuest('Sesi kamu telah tamat. Sila log masuk semula.'));
  }, [store, toGuest]);

  useEffect(() => {
    let cancelled = false;
    void api.me().then(async ({ user: u }) => {
      if (cancelled) return;
      if (u) { await attach(u); return; }
      if (store.getAccountId()) toGuest('Sesi kamu telah tamat. Sila log masuk semula.');
      else setStatus('guest');
    }).catch(() => {
      if (cancelled) return;
      // No backend reachable: stay on whatever is on this device.
      setBackend(false);
      setStatus('guest');
    });
    return () => { cancelled = true; sync.current?.stop(); };
  }, [attach, store, toGuest]);

  const value = useMemo<AuthValue>(() => ({
    status, user, backend, notice,
    clearNotice: () => setNotice(null),
    async login(b) {
      const { user: u } = await api.login(b);
      await attach(u);
      return u;
    },
    async register(b) {
      const res = await api.register(b);
      await attach(res.user, { fresh: true });
      return res;
    },
    async recover(b) {
      const res = await api.recover(b);
      await attach(res.user);
      return res;
    },
    async logout() {
      await sync.current?.finish();
      sync.current = null;
      await api.logout().catch(() => undefined);
      toGuest();
    },
    async deleteAccount(password) {
      await api.deleteAccount(password);
      toGuest();
    },
  }), [status, user, backend, notice, attach, toGuest]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
