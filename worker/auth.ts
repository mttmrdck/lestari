import type { Env } from './env';
import { HttpError, clientIp, json, rateLimit, readJson } from './http';
import { PBKDF2_ITERATIONS, hashPassword, newRecoveryCode, normalizeRecoveryCode, randomB64, randomToken, safeEqual, sha256 } from './crypto';

const DAY = 86_400_000;
const REMEMBER_MS = 30 * DAY;
const SESSION_MS = DAY;
const MIN = 60_000;

export interface User { id: string; email: string; username: string; display_name: string; created_at: number }
interface UserRow extends User { pass_hash: string; pass_salt: string; pass_iter: number; recovery_hash: string }

const publicUser = (u: User) => ({ id: u.id, email: u.email, username: u.username, displayName: u.display_name, createdAt: u.created_at });

// ---------- Validation (mirrored in src/lib/account.ts for instant form feedback) ----------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME = /^[a-z0-9_]{3,20}$/;

function checkPassword(p: unknown): string {
  if (typeof p !== 'string' || p.length < 8 || p.length > 128 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) {
    throw new HttpError(400, 'weak-password', 'Kata laluan perlu sekurang-kurangnya 8 aksara, dengan huruf dan nombor.');
  }
  return p;
}

function checkEmail(e: unknown): string {
  const email = typeof e === 'string' ? e.trim().toLowerCase() : '';
  if (email.length > 254 || !EMAIL.test(email)) throw new HttpError(400, 'bad-email', 'E-mel ini tidak sah.');
  return email;
}

function checkUsername(u: unknown): string {
  const username = typeof u === 'string' ? u.trim().toLowerCase() : '';
  if (!USERNAME.test(username)) throw new HttpError(400, 'bad-username', 'Nama pengguna perlu 3 hingga 20 aksara: huruf kecil, nombor atau garis bawah.');
  return username;
}

function checkName(n: unknown): string {
  const name = typeof n === 'string' ? n.replace(/[\p{C}]/gu, '').replace(/\s+/g, ' ').trim() : '';
  if (name.length < 2 || name.length > 24) throw new HttpError(400, 'bad-name', 'Nama paparan perlu 2 hingga 24 aksara.');
  return name;
}

// ---------- Sessions ----------

const cookieName = (secure: boolean) => (secure ? '__Host-lestari_s' : 'lestari_s');

function sessionCookie(req: Request, token: string, maxAgeMs: number | null): string {
  const secure = new URL(req.url).protocol === 'https:';
  const parts = [`${cookieName(secure)}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  // No Max-Age makes it a browser-session cookie when "Ingat saya" is off.
  if (maxAgeMs !== null) parts.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`);
  return parts.join('; ');
}

function readToken(req: Request): string | null {
  const secure = new URL(req.url).protocol === 'https:';
  const name = cookieName(secure);
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name && v) return v;
  }
  return null;
}

async function startSession(env: Env, req: Request, userId: string, remember: boolean, now: number): Promise<string> {
  const token = randomToken();
  const ttl = remember ? REMEMBER_MS : SESSION_MS;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?1').bind(now),
    env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)').bind(await sha256(token), userId, now, now + ttl),
  ]);
  return sessionCookie(req, token, remember ? ttl : null);
}

export async function currentUser(env: Env, req: Request, now: number): Promise<User | null> {
  const token = readToken(req);
  if (!token) return null;
  const hash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.username, u.display_name, u.created_at, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?1`,
  ).bind(hash).first<User & { expires_at: number }>();
  if (!row) return null;
  if (row.expires_at < now) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(hash).run();
    return null;
  }
  return row;
}

export async function requireUser(env: Env, req: Request, now: number): Promise<User> {
  const user = await currentUser(env, req, now);
  if (!user) throw new HttpError(401, 'unauthorised', 'Sila log masuk dahulu.');
  return user;
}

// ---------- Endpoints ----------

export async function register(env: Env, req: Request, now: number): Promise<Response> {
  await rateLimit(env.DB, `reg:${clientIp(req)}`, 10, 60 * MIN, now);
  const b = await readJson<Record<string, unknown>>(req);
  const displayName = checkName(b.displayName);
  const username = checkUsername(b.username);
  const email = checkEmail(b.email);
  const password = checkPassword(b.password);

  const taken = await env.DB.prepare('SELECT email, username FROM users WHERE email = ?1 OR username = ?2').bind(email, username).first<{ email: string; username: string }>();
  if (taken) throw duplicate(taken.email.toLowerCase() === email);

  const id = crypto.randomUUID();
  const salt = randomB64(16);
  const recovery = newRecoveryCode();
  try {
    await env.DB.prepare(
      `INSERT INTO users (id, email, username, display_name, pass_hash, pass_salt, pass_iter, recovery_hash, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    ).bind(id, email, username, displayName, await hashPassword(password, salt), salt, PBKDF2_ITERATIONS, await sha256(recovery), now).run();
  } catch (e) {
    // Two sign-ups can race past the check above; the UNIQUE constraints settle it.
    if (String(e).includes('UNIQUE')) throw duplicate(String(e).includes('email'));
    throw e;
  }
  const cookie = await startSession(env, req, id, !!b.remember, now);
  return json({ user: publicUser({ id, email, username, display_name: displayName, created_at: now }), recoveryCode: recovery }, { status: 201, headers: { 'set-cookie': cookie } });
}

const duplicate = (isEmail: boolean) => (isEmail
  ? new HttpError(409, 'email-taken', 'E-mel ini sudah didaftarkan. Cuba log masuk.')
  : new HttpError(409, 'username-taken', 'Nama pengguna ini sudah digunakan.'));

export async function usernameAvailable(env: Env, req: Request, now: number): Promise<Response> {
  await rateLimit(env.DB, `uname:${clientIp(req)}`, 60, MIN, now);
  const username = checkUsername(new URL(req.url).searchParams.get('u'));
  const row = await env.DB.prepare('SELECT 1 AS x FROM users WHERE username = ?1').bind(username).first();
  return json({ available: !row });
}

const findUser = (env: Env, identifier: string) =>
  env.DB.prepare('SELECT * FROM users WHERE email = ?1 OR username = ?1').bind(identifier).first<UserRow>();

export async function login(env: Env, req: Request, now: number): Promise<Response> {
  const b = await readJson<Record<string, unknown>>(req);
  const identifier = typeof b.identifier === 'string' ? b.identifier.trim().toLowerCase() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  if (!identifier || !password) throw new HttpError(400, 'missing', 'Isikan e-mel atau nama pengguna, dan kata laluan.');
  await rateLimit(env.DB, `login:${clientIp(req)}`, 30, 15 * MIN, now);
  await rateLimit(env.DB, `login:${await sha256(identifier)}`, 8, 15 * MIN, now);

  const user = await findUser(env, identifier);
  // Hash even when the account does not exist, so the response time does not reveal which is true.
  const salt = user?.pass_salt ?? 'AAAAAAAAAAAAAAAAAAAAAA==';
  const hash = await hashPassword(password, salt, user?.pass_iter ?? PBKDF2_ITERATIONS);
  if (!user || !safeEqual(hash, user.pass_hash)) throw new HttpError(401, 'bad-credentials', 'E-mel, nama pengguna atau kata laluan tidak betul.');

  const cookie = await startSession(env, req, user.id, !!b.remember, now);
  return json({ user: publicUser(user) }, { headers: { 'set-cookie': cookie } });
}

export async function logout(env: Env, req: Request): Promise<Response> {
  const token = readToken(req);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await sha256(token)).run();
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(req, '', 0) } });
}

export async function me(env: Env, req: Request, now: number): Promise<Response> {
  const user = await currentUser(env, req, now);
  return json({ user: user ? publicUser(user) : null });
}

/** Forgot password: there is no mail service, so the proof of ownership is the one-time recovery code. */
export async function recover(env: Env, req: Request, now: number): Promise<Response> {
  const b = await readJson<Record<string, unknown>>(req);
  const identifier = typeof b.identifier === 'string' ? b.identifier.trim().toLowerCase() : '';
  await rateLimit(env.DB, `recover:${clientIp(req)}`, 10, 15 * MIN, now);
  await rateLimit(env.DB, `recover:${await sha256(identifier)}`, 5, 60 * MIN, now);
  const password = checkPassword(b.password);
  const code = normalizeRecoveryCode(typeof b.recoveryCode === 'string' ? b.recoveryCode : '');
  const user = await findUser(env, identifier);
  if (!user || !safeEqual(await sha256(code), user.recovery_hash)) throw new HttpError(401, 'bad-recovery', 'E-mel atau kod pemulihan tidak betul.');

  const salt = randomB64(16);
  const nextCode = newRecoveryCode();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET pass_hash = ?1, pass_salt = ?2, pass_iter = ?3, recovery_hash = ?4 WHERE id = ?5')
      .bind(await hashPassword(password, salt), salt, PBKDF2_ITERATIONS, await sha256(nextCode), user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(user.id),
  ]);
  const cookie = await startSession(env, req, user.id, false, now);
  return json({ user: publicUser(user), recoveryCode: nextCode }, { headers: { 'set-cookie': cookie } });
}

const verifyPassword = async (user: UserRow, password: string) =>
  safeEqual(await hashPassword(password, user.pass_salt, user.pass_iter), user.pass_hash);

export async function changePassword(env: Env, req: Request, now: number): Promise<Response> {
  const session = await requireUser(env, req, now);
  await rateLimit(env.DB, `pw:${session.id}`, 8, 15 * MIN, now);
  const b = await readJson<Record<string, unknown>>(req);
  const user = (await findUser(env, session.email))!;
  if (typeof b.current !== 'string' || !(await verifyPassword(user, b.current))) throw new HttpError(401, 'bad-credentials', 'Kata laluan semasa tidak betul.');
  const next = checkPassword(b.next);
  const salt = randomB64(16);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET pass_hash = ?1, pass_salt = ?2, pass_iter = ?3 WHERE id = ?4').bind(await hashPassword(next, salt), salt, PBKDF2_ITERATIONS, user.id),
    // Every other device is signed out; this one gets a fresh session below.
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(user.id),
  ]);
  const cookie = await startSession(env, req, user.id, true, now);
  return json({ ok: true }, { headers: { 'set-cookie': cookie } });
}

export async function deleteAccount(env: Env, req: Request, now: number): Promise<Response> {
  const session = await requireUser(env, req, now);
  await rateLimit(env.DB, `del:${session.id}`, 8, 15 * MIN, now);
  const b = await readJson<Record<string, unknown>>(req);
  const user = (await findUser(env, session.email))!;
  if (typeof b.password !== 'string' || !(await verifyPassword(user, b.password))) throw new HttpError(401, 'bad-credentials', 'Kata laluan tidak betul.');
  await env.DB.batch(['sessions', 'xp_events', 'progress'].map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE user_id = ?1`).bind(user.id)).concat(env.DB.prepare('DELETE FROM users WHERE id = ?1').bind(user.id)));
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(req, '', 0) } });
}

// ---------- Progress snapshot ----------

const MAX_STATE = 300 * 1024;

export async function getProgress(env: Env, req: Request, now: number): Promise<Response> {
  const user = await requireUser(env, req, now);
  const row = await env.DB.prepare('SELECT state_json, updated_at FROM progress WHERE user_id = ?1').bind(user.id).first<{ state_json: string; updated_at: number }>();
  return json(row ? { state: JSON.parse(row.state_json), updatedAt: row.updated_at } : { state: null, updatedAt: 0 });
}

export async function putProgress(env: Env, req: Request, now: number): Promise<Response> {
  const user = await requireUser(env, req, now);
  await rateLimit(env.DB, `sync:${user.id}`, 30, MIN, now);
  const b = await readJson<{ state?: { version?: number } }>(req);
  if (!b.state || b.state.version !== 1) throw new HttpError(400, 'bad-state', 'Data kemajuan tidak sah.');
  const text = JSON.stringify(b.state);
  if (text.length > MAX_STATE) throw new HttpError(413, 'too-large', 'Data kemajuan terlalu besar.');
  await env.DB.prepare(
    `INSERT INTO progress (user_id, state_json, updated_at) VALUES (?1, ?2, ?3)
     ON CONFLICT(user_id) DO UPDATE SET state_json = ?2, updated_at = ?3`,
  ).bind(user.id, text, now).run();
  return json({ updatedAt: now });
}
