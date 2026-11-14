// DM passphrase. There is no default: nothing protects the DM view until the DM sets one.
// Only salted PBKDF2 hashes are stored, on this device, outside the campaign database, so the
// passphrase never appears in backups, exports, search or player screens.
// Recovery: a one-time recovery code shown when the passphrase is set. Last resort: erase this
// device's data and restore a backup (backups do not contain the passphrase).

export interface LockRecord {
  v: 2;
  iterations: number;
  salt: string;
  hash: string;
  recoverySalt: string;
  recoveryHash: string;
  setAt: string;
}
export const MIN_LENGTH = 8;
export const ITERATIONS = 210_000;
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

export const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => new Uint8Array(s.match(/../g)!.map((h) => parseInt(h, 16)));
export const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

export async function derive(secret: string, saltHex: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations }, key, 256);
  return hex(bits);
}
/** Constant-time comparison of two hex strings. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export function validatePassphrase(p: string): string | null {
  if (p.trim().length < MIN_LENGTH) return `Use at least ${MIN_LENGTH} characters. A short sentence is easy to remember and hard to guess.`;
  return null;
}
export const normalizeRecovery = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');
export function makeRecoveryCode(): string {
  const bytes = randomBytes(16);
  const chars = [...bytes].map((b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join('');
  return chars.match(/.{4}/g)!.join('-');
}

/** Create a lock record. Returns it with the one-time recovery code to show the DM. */
export async function createLock(passphrase: string, iterations = ITERATIONS, recoveryCode = makeRecoveryCode()): Promise<{ record: LockRecord; recoveryCode: string }> {
  const problem = validatePassphrase(passphrase);
  if (problem) throw new Error(problem);
  const salt = hex(randomBytes(16));
  const recoverySalt = hex(randomBytes(16));
  return {
    recoveryCode,
    record: {
      v: 2, iterations, salt, recoverySalt, setAt: new Date().toISOString(),
      hash: await derive(passphrase, salt, iterations),
      recoveryHash: await derive(normalizeRecovery(recoveryCode), recoverySalt, iterations),
    },
  };
}
export async function verifyPassphrase(record: LockRecord, passphrase: string): Promise<boolean> {
  return same(await derive(passphrase, record.salt, record.iterations), record.hash);
}
export async function verifyRecovery(record: LockRecord, code: string): Promise<boolean> {
  return same(await derive(normalizeRecovery(code), record.recoverySalt, record.iterations), record.recoveryHash);
}

/** The pre-0.3 numeric passcode (unsalted SHA-256). Accepted once, then upgraded to a passphrase. */
export async function verifyLegacyPin(legacyHash: string, pin: string): Promise<boolean> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`solmourn:${pin}`));
  return same(hex(buf), legacyHash);
}

// ---- storage (browser) ----
const KEY = 'solmourn.lock';
export function loadLock(): LockRecord | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return r && r.v === 2 ? r : null;
  } catch {
    return null;
  }
}
export function saveLock(r: LockRecord | null) {
  if (r) localStorage.setItem(KEY, JSON.stringify(r));
  else localStorage.removeItem(KEY);
}
