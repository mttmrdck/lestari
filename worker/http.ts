import type { D1Database } from '@cloudflare/workers-types';

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const API_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

export function json(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { ...API_HEADERS, ...init.headers } });
}

export function fail(e: HttpError): Response {
  return json({ error: e.code, message: e.message }, { status: e.status });
}

const MAX_BODY = 512 * 1024;

export async function readJson<T>(req: Request): Promise<T> {
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) throw new HttpError(415, 'content-type', 'Permintaan tidak sah.');
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'too-large', 'Data terlalu besar.');
  try { return JSON.parse(text) as T; } catch { throw new HttpError(400, 'bad-json', 'Permintaan tidak sah.'); }
}

/** Cookies are SameSite=Lax; this also refuses cross-site writes from older browsers. */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  if (!origin) return;
  // Sandboxed frames send "null", which is not a URL.
  let host: string | null = null;
  try { host = new URL(origin).host; } catch { /* treated as foreign */ }
  if (host !== new URL(req.url).host) throw new HttpError(403, 'origin', 'Permintaan tidak dibenarkan.');
}

export const clientIp = (req: Request) => req.headers.get('cf-connecting-ip') ?? 'local';

/** Fixed-window limiter backed by D1, so it holds across Worker isolates. */
export async function rateLimit(db: D1Database, key: string, limit: number, windowMs: number, now: number): Promise<void> {
  const row = await db.prepare(
    `INSERT INTO rate_limits (key, count, window_start) VALUES (?1, 1, ?2)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN window_start <= ?3 THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN window_start <= ?3 THEN ?2 ELSE window_start END
     RETURNING count`,
  ).bind(key, now, now - windowMs).first<{ count: number }>();
  if ((row?.count ?? 0) > limit) throw new HttpError(429, 'rate-limited', 'Terlalu banyak cubaan. Tunggu sebentar dan cuba lagi.');
}
