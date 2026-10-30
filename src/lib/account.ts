// Instant form feedback. The server repeats every check (worker/auth.ts) and has the final word.
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
export const validUsername = (u: string) => /^[a-z0-9_]{3,20}$/.test(u.trim().toLowerCase());
export const validName = (n: string) => n.trim().length >= 2 && n.trim().length <= 24;

export const passwordRules = (p: string) => [
  { label: 'Sekurang-kurangnya 8 aksara', ok: p.length >= 8 },
  { label: 'Ada huruf', ok: /[A-Za-z]/.test(p) },
  { label: 'Ada nombor', ok: /\d/.test(p) },
];
export const validPassword = (p: string) => p.length <= 128 && passwordRules(p).every((r) => r.ok);
