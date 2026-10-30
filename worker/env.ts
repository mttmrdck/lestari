import type { Ai, D1Database, Fetcher } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  AI: Ai;
  /** Optional; see docs/supabase.md. */
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}
