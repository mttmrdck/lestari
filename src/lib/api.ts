import type { SemanticReading } from './search';
import type { XpClaim } from './progress';

// Thin client for the Worker API. Failures become values, because every caller has a sensible
// offline behaviour: guests and the local learning loop must never depend on the network.

export interface AccountUser { id: string; email: string; username: string; displayName: string; createdAt: number }

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const OFFLINE = 'Tidak dapat menghubungi pelayan. Semak sambungan internet dan cuba lagi.';

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = 10_000): Promise<T> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(path, {
      method, credentials: 'same-origin', signal: ctl.signal,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'offline', OFFLINE);
  } finally {
    window.clearTimeout(timer);
  }
  // A static preview answers /api/* with the app's HTML; treat that as "no backend here".
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) throw new ApiError(0, 'offline', OFFLINE);
  const data = await res.json() as T & { error?: string; message?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'error', data.message ?? 'Ada masalah. Cuba lagi.');
  return data;
}

export const api = {
  me: () => request<{ user: AccountUser | null }>('GET', '/api/auth/me', undefined, 5000),
  usernameFree: (u: string) => request<{ available: boolean }>('GET', `/api/auth/nama?u=${encodeURIComponent(u)}`),
  register: (b: { displayName: string; username: string; email: string; password: string; remember: boolean }) =>
    request<{ user: AccountUser; recoveryCode: string }>('POST', '/api/auth/daftar', b),
  login: (b: { identifier: string; password: string; remember: boolean }) => request<{ user: AccountUser }>('POST', '/api/auth/masuk', b),
  logout: () => request<{ ok: true }>('POST', '/api/auth/keluar', {}),
  recover: (b: { identifier: string; recoveryCode: string; password: string }) =>
    request<{ user: AccountUser; recoveryCode: string }>('POST', '/api/auth/pulih', b),
  changePassword: (b: { current: string; next: string }) => request<{ ok: true }>('POST', '/api/auth/kata-laluan', b),
  deleteAccount: (password: string) => request<{ ok: true }>('POST', '/api/auth/padam', { password }),
  getProgress: () => request<{ state: unknown; updatedAt: number }>('GET', '/api/kemajuan'),
  putProgress: (state: unknown) => request<{ updatedAt: number }>('PUT', '/api/kemajuan', { state }),
  claimXp: (events: XpClaim[]) => request<{ total: number }>('POST', '/api/xp', { events }),
  leaderboard: (tempoh: string, demo: 'auto' | '0' | '1') => request<LeaderboardResponse>('GET', `/api/papan-juara?tempoh=${tempoh}&demo=${demo}`),
};

export interface LeaderEntry { rank: number; key: string; name: string; username: string; xp: number; move: number | null; demo: boolean; you: boolean }
export interface LeaderboardResponse { period: string; from: string; to: string; entries: LeaderEntry[]; you: LeaderEntry | null; signedIn: boolean; realPlayers: number; demoIncluded: boolean }

/** Whole-sentence reading for Carian Situasi; null means "use the local cues". */
export async function readSituation(q: string): Promise<SemanticReading | null> {
  try {
    const r = await request<SemanticReading & { available: boolean }>('POST', '/api/situasi', { q }, 4000);
    return r.available ? { neutral: r.neutral, concepts: r.concepts } : null;
  } catch {
    return null;
  }
}
