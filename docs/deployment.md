# Deployment

LESTARI is one Cloudflare Worker (`lestari`) serving the built app from `dist/`, with `/api/*` handled by `worker/index.ts`.

| Binding | Service | Purpose |
|---|---|---|
| `ASSETS` | Workers static assets | the built app, with single-page-app fallback |
| `DB` | D1 database `lestari` | accounts, sessions, XP ledger, progress copies, rate limits |
| `AI` | Workers AI (`@cf/baai/bge-m3`) | sentence embeddings for Carian Situasi |

Bindings are declared in `wrangler.jsonc`; the D1 `database_id` there is an identifier, not a credential. Two optional Worker secrets hold the Supabase URL and publishable key (`docs/supabase.md`). No password or private key is stored in the repository.

## Release

```bash
npm test && npm run build && npm run lint
npx wrangler d1 migrations apply lestari --remote   # only if migrations/ changed
npx wrangler deploy
```

`wrangler d1 migrations apply` runs only migrations that have not been applied. Keep migrations additive. Before anything destructive, export first: `npx wrangler d1 export lestari --remote --output backup.sql`.

Rollback: `npx wrangler deployments list`, then `npx wrangler rollback <version-id>`. A rollback does not undo a database migration.

## After deploying

Check `/api/health`, register a test account, run a theme filter and a situation search, and answer a quiz question while signed in. Delete the test account from Akaun afterwards so it does not appear on the board.
