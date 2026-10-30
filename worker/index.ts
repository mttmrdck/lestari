import type { Env } from './env';
import { HttpError, assertSameOrigin, fail, json } from './http';
import { changePassword, deleteAccount, getProgress, login, logout, me, putProgress, recover, register, usernameAvailable } from './auth';
import { claimXp } from './xp';
import { leaderboard } from './leaderboard';
import { situasi } from './situasi';

type Handler = (env: Env, req: Request, now: number) => Promise<Response>;

const ROUTES: Record<string, Handler> = {
  'GET /api/health': async () => json({ ok: true }),
  'GET /api/auth/me': me,
  'GET /api/auth/nama': usernameAvailable,
  'POST /api/auth/daftar': register,
  'POST /api/auth/masuk': login,
  'POST /api/auth/keluar': (env, req) => logout(env, req),
  'POST /api/auth/pulih': recover,
  'POST /api/auth/kata-laluan': changePassword,
  'POST /api/auth/padam': deleteAccount,
  'GET /api/kemajuan': getProgress,
  'PUT /api/kemajuan': putProgress,
  'POST /api/xp': claimXp,
  'GET /api/papan-juara': leaderboard,
  'POST /api/situasi': situasi,
};

export async function handleApi(req: Request, env: Env, now = Date.now()): Promise<Response> {
  const { pathname } = new URL(req.url);
  const handler = ROUTES[`${req.method} ${pathname}`];
  if (!handler) return json({ error: 'not-found', message: 'Laluan tidak ditemui.' }, { status: 404 });
  try {
    if (req.method !== 'GET') assertSameOrigin(req);
    return await handler(env, req, now);
  } catch (e) {
    if (e instanceof HttpError) return fail(e);
    console.error('api error', pathname, e);
    return json({ error: 'server', message: 'Pelayan menghadapi masalah. Cuba lagi sebentar.' }, { status: 500 });
  }
}

export default {
  fetch(req: Request, env: Env): Promise<Response> | Response {
    if (new URL(req.url).pathname.startsWith('/api/')) return handleApi(req, env);
    return env.ASSETS.fetch(req as never) as unknown as Promise<Response>;
  },
};
