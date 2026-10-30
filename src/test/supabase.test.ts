// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getSupabase, readSupabaseConfig } from '../lib/supabase';
import { createWorkerSupabase, supabaseConfig, supabaseHealth } from '../../worker/supabase';
import { handleApi } from '../../worker/index';
import { createD1 } from './d1-shim';
import type { Env } from '../../worker/env';

const URL_ = 'https://contoh.supabase.co';
const KEY = 'sb_publishable_ujian';
const env = (extra: Partial<Env> = {}) => ({ DB: createD1(), ...extra }) as unknown as Env;
const req = new Request('https://lestari.test/api/supabase/status');

describe('Supabase configuration', () => {
  it('reads both values', () => {
    expect(readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY })).toEqual({ url: URL_, key: KEY });
  });

  it.each([[{}], [{ NEXT_PUBLIC_SUPABASE_URL: URL_ }], [{ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY }], [{ NEXT_PUBLIC_SUPABASE_URL: 'http://tidak-selamat', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY }]])('treats incomplete config as absent %#', (e) => {
    expect(readSupabaseConfig(e)).toBeNull();
  });

  it('gives null rather than throwing when unconfigured', async () => {
    expect(await getSupabase(null)).toBeNull();
    expect(await createWorkerSupabase(env())).toBeNull();
  });

  it('initialises clients that hold no session', async () => {
    const browser = await getSupabase({ url: URL_, key: KEY });
    expect((await browser!.auth.getSession()).data.session).toBeNull();
    const worker = await createWorkerSupabase(env({ NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY }));
    expect((await worker!.auth.getSession()).data.session).toBeNull();
  });
});

describe('Supabase status endpoint', () => {
  const configured = () => env({ NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY });

  it('reports a missing configuration without failing', async () => {
    const res = await handleApi(req, env(), 1000);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: false, reachable: false });
  });

  it('reports reachability and never echoes the key', async () => {
    const res = await supabaseHealth(configured(), req, 1000, (async () => new Response('{}')) as typeof fetch);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ configured: true, reachable: true });
    expect(text).not.toContain(KEY);
  });

  it('survives Supabase being down', async () => {
    const res = await supabaseHealth(configured(), req, 1000, (async () => { throw new Error('down'); }) as typeof fetch);
    expect(await res.json()).toEqual({ configured: true, reachable: false });
  });

  it('is rate-limited', async () => {
    const e = configured();
    for (let i = 0; i < 6; i++) await handleApi(req, e, 1000);
    expect((await handleApi(req, e, 1000)).status).toBe(429);
  });

  it('keeps Cloudflare login independent of Supabase', () => {
    expect(supabaseConfig(env())).toBeNull();
  });
});
