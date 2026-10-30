import type { Ai, D1Database, Fetcher } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  AI: Ai;
}
