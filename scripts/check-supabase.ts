/**
 * Confirms the Supabase project in .env.local answers with the publishable key: npm run supabase:check
 * It reads public auth settings only. Listing tables needs a secret key, which this project does not hold.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { readSupabaseConfig } from '../src/lib/supabase';

const env = Object.fromEntries(readFileSync(join(import.meta.dirname, '../.env.local'), 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const config = readSupabaseConfig(env);
if (!config) { console.error('Supabase is not configured in .env.local'); process.exit(1); }
if (!config.key.startsWith('sb_publishable_')) { console.error('Expected a publishable key.'); process.exit(1); }

const client = createClient(config.url, config.key, { auth: { persistSession: false } });
const { data, error } = await client.auth.getSession();
if (error) { console.error('Client failed to initialise:', error.message); process.exit(1); }
const res = await fetch(`${config.url}/auth/v1/settings`, { headers: { apikey: config.key } });
console.log(`client initialised, session: ${data.session ? 'present' : 'none'}`);
console.log(`auth settings: HTTP ${res.status}`);
process.exit(res.ok ? 0 : 1);
