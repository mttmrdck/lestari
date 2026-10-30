# Security notes

Audit of the Cloudflare backend. Last reviewed with real tests in `src/test/worker.test.ts`.

| Area | Implementation | Status |
|---|---|---|
| Passwords | PBKDF2-HMAC-SHA256, 100,000 rounds, 16-byte random salt, rounds stored per user | Limit below; see below |
| Sessions | 32 random bytes; only the SHA-256 is stored; 24 hours, or 30 days with Ingat saya; revoked on logout, password change and recovery | Good |
| Cookie | `__Host-` prefix, HttpOnly, Secure, SameSite=Lax | Good |
| CSRF | SameSite=Lax, JSON content type required, Origin checked on every write | Good |
| Login limits | 8 attempts per person and IP, 40 per account, 30 per IP, each per 15 minutes | Good |
| Enumeration | Login and recovery use one error message; an unknown account still costs a hash | Partial, see below |
| Recovery codes | 80 random bits, unbiased alphabet, stored as SHA-256, one use, rotated on use, replaceable with the password | Good |
| Account deletion | Password required; removes sessions, XP, progress and the user | Good |
| Authorisation | Every private endpoint resolves the user from the session; no endpoint accepts a user id | Good |
| XP | Server prices actions, unique ledger keys, daily caps | See limits below |
| Headers | CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy via `public/_headers` | Good |
| Offline cache | The service worker skips `/api/` and all non-GET requests | Tested |

## Known limits

**Password hashing.** OWASP asks for 600,000 PBKDF2-SHA256 rounds; LESTARI uses 100,000. On Cloudflare's edge, a higher count fails with `iteration counts above 100000 are not supported`. Checked on 31 Oct 2026 with a temporary remote preview. Local `wrangler dev` does not enforce this limit, so a local test proves nothing.

A stronger option exists: `node:crypto` scrypt ran on the edge with `nodejs_compat`, at N=2^17, r=8, p=1. It was not adopted, because the wall-clock cost is roughly 240ms locally and Cloudflare's free plan limits CPU per request far below that, so logins could fail under the plan limit. To adopt it: confirm the plan (paid Workers allow enough CPU), store an algorithm marker per user, and upgrade hashes at next login. With 0 accounts today, no migration is needed yet. A Worker-secret pepper is a cheaper alternative that protects against a database-only leak.

**Enumeration.** Registration has to say that an email or username is taken, and the availability check confirms usernames. Both are rate-limited. Emails are never shown publicly; usernames appear on the leaderboard by design.

**Quiz XP.** Questions are graded in the browser. A script can claim correct answers for real sayings, limited to 300 XP a day. Daily challenge wins are re-graded on the server. Closing this needs server-delivered questions.

**Recovery without email.** Losing both the password and the code loses the account. This is stated in the app.
