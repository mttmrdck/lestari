// Passwords: PBKDF2-HMAC-SHA256 through WebCrypto. 100,000 iterations is the most the Workers runtime
// allows. The count is stored per user, so it can be raised later without locking anyone out.
export const PBKDF2_ITERATIONS = 100_000;

const enc = new TextEncoder();
const b64 = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function randomB64(n: number): string {
  return b64(crypto.getRandomValues(new Uint8Array(n)));
}

export function randomToken(): string {
  return randomB64(32).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256(input: string): Promise<string> {
  return b64(await crypto.subtle.digest('SHA-256', enc.encode(input)));
}

export async function hashPassword(password: string, saltB64: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations }, key, 256));
}

/** Compares without leaking where two strings differ. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** One-time account recovery code, e.g. "K7QM-2XPD-RT9H-WC4B" (80 bits). */
export function newRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const chars = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return chars.match(/.{4}/g)!.join('-');
}

export const normalizeRecoveryCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').match(/.{1,4}/g)?.join('-') ?? '';
