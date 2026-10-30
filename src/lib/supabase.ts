import type { SupabaseClient } from '@supabase/supabase-js';

// Optional Supabase access for future features. Cloudflare remains the source of truth for accounts,
// sessions and XP (docs/supabase.md), so this client never signs anyone in: it holds no session.
// supabase-js is imported on first use, so screens that do not need it do not download it.

export interface SupabaseConfig { url: string; key: string }

export function readSupabaseConfig(env: Record<string, unknown> = import.meta.env): SupabaseConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (typeof url !== 'string' || typeof key !== 'string' || !url.startsWith('https://') || !key) return null;
  return { url, key };
}

let client: Promise<SupabaseClient | null> | null = null;

/** The shared browser client, or null when Supabase is not configured. Callers must handle null. */
export function getSupabase(config = readSupabaseConfig()): Promise<SupabaseClient | null> {
  if (!config) return Promise.resolve(null);
  client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }));
  return client;
}
