// Server side of Solmourn sync, as a pure request handler so it can be tested without Cloudflare.
// One DM, one campaign: a single shared passphrase, one synced snapshot, one read-only feed link.
//
// The passphrase never reaches the server. The app stretches it with PBKDF2 (salt from here) and
// sends the result; the server keeps only a SHA-256 of that. Same for the recovery code.
import { renderFeed, renderFeedIndex, type FeedTables } from '../src/domain/dmFeed';

export interface Store {
  get<T>(key: string): Promise<T | undefined>;
  /** Writes all entries atomically. */
  put(entries: Record<string, unknown>): Promise<void>;
  delete(keys: string[]): Promise<void>;
}
export interface ApiEnv {
  /** Optional Cloudflare secret. When set, entering it in the app clears a forgotten passphrase (campaign data is kept). */
  RESET_PASSPHRASE?: string;
}

interface AuthRecord {
  salt: string;
  iterations: number;
  verifier: string;
  recoverySalt: string;
  recoveryVerifier: string;
  setAt: string;
}
interface SnapMeta {
  rev: number;
  updatedAt: string;
  encoding: 'gzip' | 'identity';
  chunks: number;
  bytes: number;
}

const CHUNK = 1_000_000; // bytes per stored value (Durable Object limit is 2 MB)
const MAX_SNAPSHOT = 25_000_000;
const TOKEN_DAYS = 400;
const MAX_TOKENS = 25;
const FAIL_WINDOW = 15 * 60_000;
const MAX_FAILS = 10;

// ---------- helpers ----------
const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const randomHex = (n: number) => hex(crypto.getRandomValues(new Uint8Array(n)));
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const isHex = (s: unknown, len: number): s is string => typeof s === 'string' && s.length === len && /^[0-9a-f]+$/.test(s);
const okIterations = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 100_000 && (n as number) <= 5_000_000;

const HEADERS = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...HEADERS, 'Content-Type': 'application/json' } });
const text = (body: string, status = 200) => new Response(body, { status, headers: { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8' } });
const fail = (status: number, error: string) => json({ error }, status);

async function body<T>(req: Request): Promise<Partial<T>> {
  try {
    const v = await req.json();
    return v && typeof v === 'object' ? (v as Partial<T>) : {};
  } catch {
    return {};
  }
}

interface NewSecret { salt: string; iterations: number; authKey: string; recoverySalt: string; recoveryKey: string }
function validSecret(b: Partial<NewSecret>): b is NewSecret {
  return isHex(b.salt, 32) && okIterations(b.iterations) && isHex(b.authKey, 64) && isHex(b.recoverySalt, 32) && isHex(b.recoveryKey, 64);
}
async function authRecord(b: NewSecret): Promise<AuthRecord> {
  return { salt: b.salt, iterations: b.iterations, verifier: await sha256(b.authKey), recoverySalt: b.recoverySalt, recoveryVerifier: await sha256(b.recoveryKey), setAt: new Date().toISOString() };
}

// ---------- the handler ----------
export class Api {
  constructor(private store: Store, private env: ApiEnv = {}, private now: () => number = Date.now) {}

  private async issueToken(revokeOthers: boolean): Promise<string> {
    const token = randomHex(32);
    const tokens = revokeOthers ? {} : ((await this.store.get<Record<string, number>>('tokens')) ?? {});
    tokens[await sha256(token)] = this.now();
    const kept = Object.entries(tokens).sort((a, b) => b[1] - a[1]).slice(0, MAX_TOKENS);
    await this.store.put({ tokens: Object.fromEntries(kept) });
    return token;
  }
  private async authorized(req: Request): Promise<boolean> {
    const m = /^Bearer ([0-9a-f]{64})$/.exec(req.headers.get('Authorization') ?? '');
    if (!m) return false;
    const tokens = (await this.store.get<Record<string, number>>('tokens')) ?? {};
    const issued = tokens[await sha256(m[1])];
    return !!issued && this.now() - issued < TOKEN_DAYS * 86_400_000;
  }
  private async limited(): Promise<boolean> {
    const fails = ((await this.store.get<number[]>('fails')) ?? []).filter((t) => this.now() - t < FAIL_WINDOW);
    return fails.length >= MAX_FAILS;
  }
  private async recordFail() {
    const fails = ((await this.store.get<number[]>('fails')) ?? []).filter((t) => this.now() - t < FAIL_WINDOW);
    await this.store.put({ fails: [...fails, this.now()] });
  }
  private async readKey(): Promise<string> {
    let key = await this.store.get<string>('readKey');
    if (!key) {
      key = randomHex(16);
      await this.store.put({ readKey: key });
    }
    return key;
  }

  private async snapshot(): Promise<{ meta: SnapMeta; bytes: Uint8Array } | null> {
    const meta = await this.store.get<SnapMeta>('snap:meta');
    if (!meta) return null;
    const out = new Uint8Array(meta.bytes);
    let at = 0;
    for (let i = 0; i < meta.chunks; i++) {
      const part = await this.store.get<Uint8Array | ArrayBuffer>(`snap:${meta.rev}:${i}`);
      if (!part) throw new Error(`snapshot chunk ${i} missing`);
      const u = part instanceof Uint8Array ? part : new Uint8Array(part);
      out.set(u, at);
      at += u.byteLength;
    }
    return { meta, bytes: out };
  }
  private async feedTables(): Promise<{ tables: FeedTables; meta: SnapMeta } | null> {
    const snap = await this.snapshot();
    if (!snap) return null;
    let raw: Uint8Array = snap.bytes;
    if (snap.meta.encoding === 'gzip') {
      const stream = new Blob([raw as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
      raw = new Uint8Array(await new Response(stream).arrayBuffer());
    }
    const data = JSON.parse(new TextDecoder().decode(raw));
    return { tables: data.tables ?? {}, meta: snap.meta };
  }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '');
    const method = req.method;
    try {
      // ---- passphrase ----
      if (path === '/api/auth/params' && method === 'GET') {
        const a = await this.store.get<AuthRecord>('auth');
        return json({ app: 'solmourn', v: 1, configured: !!a, salt: a?.salt, iterations: a?.iterations, recoverySalt: a?.recoverySalt, resetAvailable: !!this.env.RESET_PASSPHRASE });
      }
      if (path === '/api/auth/setup' && method === 'POST') {
        if (await this.store.get('auth')) return fail(409, 'A passphrase is already set. Unlock with it instead.');
        const b = await body<NewSecret>(req);
        if (!validSecret(b)) return fail(400, 'Bad request');
        await this.store.put({ auth: await authRecord(b) });
        return json({ token: await this.issueToken(true) });
      }
      if (path === '/api/auth/login' && method === 'POST') {
        const a = await this.store.get<AuthRecord>('auth');
        if (!a) return fail(409, 'No passphrase is set yet.');
        if (await this.limited()) return fail(429, 'Too many wrong attempts. Wait 15 minutes.');
        const b = await body<{ authKey: string }>(req);
        if (!isHex(b.authKey, 64) || !same(await sha256(b.authKey), a.verifier)) {
          await this.recordFail();
          return fail(401, 'That is not the passphrase.');
        }
        return json({ token: await this.issueToken(false) });
      }
      if (path === '/api/auth/change' && method === 'POST') {
        if (!(await this.authorized(req))) return fail(401, 'Unlock again first.');
        const b = await body<NewSecret>(req);
        if (!validSecret(b)) return fail(400, 'Bad request');
        await this.store.put({ auth: await authRecord(b) });
        return json({ token: await this.issueToken(true) }); // other devices must unlock with the new passphrase
      }
      if (path === '/api/auth/recover' && method === 'POST') {
        const a = await this.store.get<AuthRecord>('auth');
        if (!a) return fail(409, 'No passphrase is set yet.');
        if (await this.limited()) return fail(429, 'Too many wrong attempts. Wait 15 minutes.');
        const b = await body<NewSecret & { proof: string }>(req);
        if (!isHex(b.proof, 64) || !same(await sha256(b.proof), a.recoveryVerifier)) {
          await this.recordFail();
          return fail(401, 'That recovery code does not match.');
        }
        if (!validSecret(b)) return fail(400, 'Bad request');
        await this.store.put({ auth: await authRecord(b) });
        return json({ token: await this.issueToken(true) });
      }
      if (path === '/api/auth/reset' && method === 'POST') {
        const secret = this.env.RESET_PASSPHRASE;
        if (!secret) return fail(404, 'Not enabled');
        if (await this.limited()) return fail(429, 'Too many wrong attempts. Wait 15 minutes.');
        const b = await body<{ secret: string }>(req);
        if (typeof b.secret !== 'string' || !same(await sha256(b.secret), await sha256(secret))) {
          await this.recordFail();
          return fail(401, 'That reset value does not match.');
        }
        await this.store.delete(['auth', 'tokens', 'fails']);
        return json({ ok: true });
      }

      // ---- read-only feed (for ChatGPT or any browser) ----
      const feed = /^\/api\/dm\/([0-9a-f]{32})(?:\/([a-z0-9-]+))?$/.exec(path);
      if (feed && method === 'GET') {
        const key = await this.store.get<string>('readKey');
        if (!key || !same(feed[1], key)) return text('Not found', 404);
        const data = await this.feedTables();
        if (!data) return text('No campaign has been synced yet. Open the app on any device and unlock it once.');
        const base = `${url.origin}/api/dm/${key}`;
        if (!feed[2]) return text(renderFeedIndex(data.tables, base, { rev: data.meta.rev, updatedAt: data.meta.updatedAt }));
        const page = renderFeed(data.tables, feed[2]);
        return page === null ? text(`No such section. Start at ${base}`, 404) : text(page);
      }

      // ---- everything below needs an unlocked device ----
      if (!path.startsWith('/api/')) return fail(404, 'Not found');
      if (!(await this.authorized(req))) return fail(401, 'Unlock again.');

      if (path === '/api/readkey' && method === 'GET') return json({ readKey: await this.readKey() });
      if (path === '/api/readkey/rotate' && method === 'POST') {
        const key = randomHex(16);
        await this.store.put({ readKey: key });
        return json({ readKey: key });
      }
      if (path === '/api/sync/meta' && method === 'GET') {
        const meta = await this.store.get<SnapMeta>('snap:meta');
        return json({ rev: meta?.rev ?? 0, updatedAt: meta?.updatedAt ?? null });
      }
      if (path === '/api/sync' && method === 'GET') {
        const snap = await this.snapshot();
        if (!snap) return new Response(null, { status: 204, headers: { ...HEADERS, 'X-Rev': '0' } });
        return new Response(snap.bytes as BodyInit, {
          headers: { ...HEADERS, 'Content-Type': 'application/octet-stream', 'X-Rev': String(snap.meta.rev), 'X-Encoding': snap.meta.encoding, 'X-Updated-At': snap.meta.updatedAt },
        });
      }
      if (path === '/api/sync' && method === 'PUT') {
        const base = Number(url.searchParams.get('base'));
        const encoding = req.headers.get('X-Encoding') === 'gzip' ? 'gzip' : 'identity';
        const bytes = new Uint8Array(await req.arrayBuffer());
        if (!Number.isInteger(base) || base < 0) return fail(400, 'Bad request');
        if (!bytes.byteLength || bytes.byteLength > MAX_SNAPSHOT) return fail(413, 'Snapshot too large');
        const old = await this.store.get<SnapMeta>('snap:meta');
        const current = old?.rev ?? 0;
        if (base !== current) return json({ error: 'conflict', rev: current, updatedAt: old?.updatedAt ?? null }, 409);
        const rev = current + 1;
        const meta: SnapMeta = { rev, updatedAt: new Date(this.now()).toISOString(), encoding, chunks: Math.ceil(bytes.byteLength / CHUNK), bytes: bytes.byteLength };
        const entries: Record<string, unknown> = { 'snap:meta': meta };
        for (let i = 0; i < meta.chunks; i++) entries[`snap:${rev}:${i}`] = bytes.slice(i * CHUNK, (i + 1) * CHUNK);
        await this.store.put(entries);
        if (old) await this.store.delete(Array.from({ length: old.chunks }, (_, i) => `snap:${old.rev}:${i}`));
        return json({ rev, updatedAt: meta.updatedAt });
      }
      return fail(404, 'Not found');
    } catch (e) {
      return fail(500, `Server error: ${(e as Error).message}`);
    }
  }
}
