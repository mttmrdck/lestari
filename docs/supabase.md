# Supabase in LESTARI

**Status:** optional service integration. No LESTARI feature uses Supabase yet, and no Supabase tables exist for this app.

## Decision

Cloudflare stays authoritative for accounts, passwords, recovery codes, sessions, progress copies and the XP ledger (Worker plus D1). Supabase Auth is not used, so there is one login system.

LESTARI is Vite and React on Cloudflare Workers, not Next.js:

| Next.js guide item | Here | Why |
|---|---|---|
| `@supabase/ssr` | Not installed | It stores Supabase Auth sessions in cookies. With no Supabase sessions it would only add a second auth surface. |
| `utils/supabase/client.ts` | `src/lib/supabase.ts` | Lazy browser client that returns null when unconfigured. |
| `utils/supabase/server.ts` | `worker/supabase.ts` | Request-scoped Worker client with no session. |
| `middleware.ts` session refresh | None | There is no Supabase session to refresh. |

## Configuration

| Where | How |
|---|---|
| Local | `.env.local` (git-ignored, see `.env.example`), read by `vite build` and `wrangler dev` |
| Production Worker | `npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These values are not secret; Worker secrets are used so they stay out of the repository and survive deploys. |

The `NEXT_PUBLIC_` names work because `vite.config.ts` lists that prefix in `envPrefix`. Anything with that prefix can reach the browser, so a secret or service-role key must never use it.

Checks: `npm run supabase:check` locally, and `GET /api/supabase/status` on a deployment (rate-limited, reads no data).

## Before adding the first table

Follow `.claude/skills/supabase/SKILL.md` and `supabase-postgres-best-practices`:

- Enable RLS on every table in `public`, and grant `anon` or `authenticated` explicitly.
- `auth.uid()` will be null here, because nobody signs in to Supabase. Policies must be written for that: public read-only content can use `to anon`, but private per-user data cannot be protected this way. It must stay in D1 behind the Worker, or the Worker must call Supabase with a server-only secret key after checking the Cloudflare session.
- Never let the browser write XP, roles or leaderboard scores.
- Add `connect-src https://<project>.supabase.co` to `public/_headers` if the browser calls Supabase directly. The current policy blocks it on purpose.

## If you later want Supabase Auth

This needs your approval and is not automatic. It would mean moving users into `auth.users`, replacing recovery codes with email (and configuring a mail provider), moving sessions and XP, and rewriting Worker authorisation. PBKDF2 hashes could not be imported as they are, so existing users would need a reset or a verify-on-login bridge. Production has 0 accounts today, so this is cheapest now if it is wanted.
