import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from './env';
import { clientIp, json, rateLimit } from './http';

// Server-side Supabase access. Only the publishable key is available here, so every query is still
// subject to Row Level Security. A privileged key, if ever needed, must be a Worker secret that is
// never prefixed NEXT_PUBLIC_.

export function supabaseConfig(env: Env): { url: string; key: string } | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url?.startsWith('https://') && key ? { url, key } : null;
}

/** A request-scoped client, or null when not configured. No session: Cloudflare owns sign-in. */
export async function createWorkerSupabase(env: Env): Promise<SupabaseClient | null> {
  const config = supabaseConfig(env);
  if (!config) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

/** Proves this deployment can reach Supabase, without touching any data. */
export async function supabaseHealth(env: Env, req: Request, now: number, fetcher: typeof fetch = fetch): Promise<Response> {
  await rateLimit(env.DB, `supabase-health:${clientIp(req)}`, 6, 60_000, now);
  const config = supabaseConfig(env);
  if (!config) return json({ configured: false, reachable: false });
  try {
    const res = await fetcher(`${config.url}/auth/v1/settings`, { headers: { apikey: config.key }, signal: AbortSignal.timeout(4000) });
    return json({ configured: true, reachable: res.ok });
  } catch {
    return json({ configured: true, reachable: false });
  }
}
