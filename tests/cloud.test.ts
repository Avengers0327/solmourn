// One passphrase and one campaign across devices (Cloudflare Worker sync), and the read-only
// DM feed for ChatGPT. The server runs in-process against an in-memory store; fetch is routed to it.
import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Api, type Store } from '../worker/api';
import { feedSections, renderFeed, renderFeedIndex } from '../src/domain/dmFeed';
import { seedV2 } from './fixtures/seedV2';
import { applySeed } from '../src/data/seedEngine';
import { exportBackup, wipeAll } from '../src/data/backup';
import { db } from '../src/data/db';
import { update } from '../src/data/repo';
import { derive } from '../src/domain/passphrase';
import type { NPC } from '../src/domain/types';

// ---------- test doubles ----------
class MemStore implements Store {
  data = new Map<string, unknown>();
  async get<T>(k: string) { return structuredClone(this.data.get(k)) as T | undefined; }
  async put(e: Record<string, unknown>) { for (const [k, v] of Object.entries(e)) this.data.set(k, structuredClone(v)); }
  async delete(keys: string[]) { for (const k of keys) this.data.delete(k); }
}
const mem = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};
(globalThis as Record<string, unknown>).location = { origin: 'https://solmourn.example.workers.dev' };

let store: MemStore;
let api: Api;
let online = true;
const ORIGIN = 'https://solmourn.example.workers.dev';
const req = (path: string, init?: RequestInit) => api.handle(new Request(ORIGIN + path, init));
const postJson = (path: string, body: unknown, token?: string) =>
  req(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (!online) throw new TypeError('Failed to fetch');
  return api.handle(new Request(ORIGIN + String(input), init));
}) as typeof fetch;

const FAST = 100_000;
async function secret(pass: string, code = 'AAAA-BBBB-CCCC-DDDD') {
  const salt = '0'.repeat(31) + '1';
  const recoverySalt = '0'.repeat(31) + '2';
  return { salt, recoverySalt, iterations: FAST, authKey: await derive(pass, salt, FAST), recoveryKey: await derive(code.replace(/-/g, ''), recoverySalt, FAST) };
}

beforeEach(() => {
  store = new MemStore();
  api = new Api(store, {});
  online = true;
  mem.clear();
});

// ---------- server ----------
describe('server: one shared passphrase', () => {
  it('starts unconfigured, and the first setup wins', async () => {
    expect(await (await req('/api/auth/params')).json()).toMatchObject({ app: 'solmourn', configured: false });
    const r = await postJson('/api/auth/setup', await secret('cold lamps burn'));
    expect(r.status).toBe(200);
    expect((await r.json()).token).toMatch(/^[0-9a-f]{64}$/);
    expect((await postJson('/api/auth/setup', await secret('someone else'))).status).toBe(409);
    expect(await (await req('/api/auth/params')).json()).toMatchObject({ configured: true, iterations: FAST });
  });
  it('never stores the passphrase or anything it was derived to', async () => {
    const s = await secret('cold lamps burn');
    await postJson('/api/auth/setup', s);
    const all = JSON.stringify([...store.data.entries()]);
    expect(all).not.toContain('cold lamps');
    expect(all).not.toContain(s.authKey);
    expect(all).not.toContain(s.recoveryKey);
  });
  it('logs in with the right key only, and rate-limits guessing', async () => {
    await postJson('/api/auth/setup', await secret('cold lamps burn'));
    expect((await postJson('/api/auth/login', { authKey: (await secret('cold lamps burn')).authKey })).status).toBe(200);
    for (let i = 0; i < 10; i++) expect((await postJson('/api/auth/login', { authKey: (await secret(`wrong ${i} guess`)).authKey })).status).toBe(401);
    expect((await postJson('/api/auth/login', { authKey: (await secret('cold lamps burn')).authKey })).status).toBe(429);
  });
  it('changing the passphrase signs every other device out', async () => {
    const t1 = (await (await postJson('/api/auth/setup', await secret('cold lamps burn'))).json()).token;
    const t2 = (await (await postJson('/api/auth/login', { authKey: (await secret('cold lamps burn')).authKey })).json()).token;
    const t3 = (await (await postJson('/api/auth/change', await secret('new passphrase here'), t2)).json()).token;
    const meta = (t: string) => req('/api/sync/meta', { headers: { Authorization: `Bearer ${t}` } });
    expect((await meta(t1)).status).toBe(401);
    expect((await meta(t2)).status).toBe(401);
    expect((await meta(t3)).status).toBe(200);
    expect((await postJson('/api/auth/login', { authKey: (await secret('cold lamps burn')).authKey })).status).toBe(401);
    expect((await postJson('/api/auth/login', { authKey: (await secret('new passphrase here')).authKey })).status).toBe(200);
  });
  it('recovers with the recovery code, and the optional Cloudflare reset keeps the campaign', async () => {
    const t = (await (await postJson('/api/auth/setup', await secret('cold lamps burn', 'WXYZ-WXYZ-WXYZ-WXYZ'))).json()).token;
    await req('/api/sync?base=0', { method: 'PUT', headers: { Authorization: `Bearer ${t}` }, body: new TextEncoder().encode('{"tables":{}}') });
    const proof = await derive('WXYZWXYZWXYZWXYZ', '0'.repeat(31) + '2', FAST);
    expect((await postJson('/api/auth/recover', { proof: 'f'.repeat(64), ...(await secret('another one!')) })).status).toBe(401);
    expect((await postJson('/api/auth/recover', { proof, ...(await secret('another one!')) })).status).toBe(200);
    expect((await postJson('/api/auth/reset', { secret: 'x' })).status).toBe(404); // not enabled
    api = new Api(store, { RESET_PASSPHRASE: 'my reset value' });
    expect((await postJson('/api/auth/reset', { secret: 'nope' })).status).toBe(401);
    expect((await postJson('/api/auth/reset', { secret: 'my reset value' })).status).toBe(200);
    expect(await (await req('/api/auth/params')).json()).toMatchObject({ configured: false });
    expect(store.data.get('snap:meta')).toMatchObject({ rev: 1 });
  });
  it('sync needs a token and refuses uploads based on an old version', async () => {
    expect((await req('/api/sync/meta')).status).toBe(401);
    const t = (await (await postJson('/api/auth/setup', await secret('cold lamps burn'))).json()).token;
    const auth = { Authorization: `Bearer ${t}` };
    const big = new Uint8Array(2_500_000).fill(65); // spans three stored chunks
    expect(await (await req('/api/sync?base=0', { method: 'PUT', headers: auth, body: big })).json()).toMatchObject({ rev: 1 });
    expect((await req('/api/sync?base=0', { method: 'PUT', headers: auth, body: big })).status).toBe(409);
    const got = await req('/api/sync', { headers: auth });
    expect(got.headers.get('X-Rev')).toBe('1');
    expect(new Uint8Array(await got.arrayBuffer())).toEqual(big);
    await req('/api/sync?base=1', { method: 'PUT', headers: auth, body: new Uint8Array([1, 2, 3]) });
    expect([...store.data.keys()].filter((k) => k.startsWith('snap:1:'))).toEqual([]); // old chunks removed
  });
});

// ---------- DM feed ----------
describe('read-only DM feed for ChatGPT', () => {
  const tables = seedV2().tables as never;
  it('renders every section, with the DM-only truth included', () => {
    for (const s of feedSections(tables)) expect(renderFeed(tables, s.id), s.id).toBeTruthy();
    const s1 = renderFeed(tables, 'session-1')!;
    expect(s1).toContain('Blackout in Frostward');
    expect(s1).toContain('Exchange 17');
    expect(s1).toContain('Read aloud');
    expect(renderFeed(tables, 'people')).toContain('Ilan Rook');
    expect(renderFeed(tables, 'mysteries')).toContain('## Revelations');
    expect(renderFeed(tables, 'nope')).toBeNull();
    const idx = renderFeedIndex(tables, 'https://x/api/dm/k', { rev: 3, updatedAt: '2026-11-14' });
    expect(idx).toContain('https://x/api/dm/k/session-15');
  });
  it('is served only with the secret key, and only from the synced copy', async () => {
    const t = (await (await postJson('/api/auth/setup', await secret('cold lamps burn'))).json()).token;
    const key = (await (await req('/api/readkey', { headers: { Authorization: `Bearer ${t}` } })).json()).readKey;
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(await (await req(`/api/dm/${key}`)).text()).toContain('No campaign has been synced yet');
    const snap = JSON.stringify({ tables: seedV2().tables });
    const gz = new Uint8Array(await new Response(new Blob([snap]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
    await req('/api/sync?base=0', { method: 'PUT', headers: { Authorization: `Bearer ${t}`, 'X-Encoding': 'gzip' }, body: gz });
    const index = await req(`/api/dm/${key}`);
    expect(index.status).toBe(200);
    expect(index.headers.get('Content-Type')).toContain('text/plain');
    expect(index.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(await index.text()).toContain(`${ORIGIN}/api/dm/${key}/session-1`);
    expect(await (await req(`/api/dm/${key}/session-1`)).text()).toContain('Ilan Rook');
    expect((await req(`/api/dm/${'0'.repeat(32)}`)).status).toBe(404);
    const fresh = (await (await postJson('/api/readkey/rotate', {}, t)).json()).readKey;
    expect((await req(`/api/dm/${key}`)).status).toBe(404); // old link switched off
    expect((await req(`/api/dm/${fresh}/people`)).status).toBe(200);
  });
});

// ---------- the app's side ----------
describe('app: one passphrase on every device', () => {
  beforeAll(() => { (globalThis as Record<string, unknown>).navigator ??= {}; });
  beforeEach(async () => { await wipeAll(); await applySeed(seedV2()); });

  it('the first device online makes its passphrase the shared one; a second device unlocks with it', async () => {
    const { setPassphrase, unlock } = await import('../src/data/passFlow');
    const { getCloud } = await import('../src/data/cloud');
    const code = await setPassphrase('cold lamps burn');
    expect(code).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
    expect(getCloud()).toMatchObject({ configured: true });
    // "Second device": nothing on it yet.
    mem.clear();
    expect((await unlock('wrong passphrase'))).toMatchObject({ ok: false });
    expect((await unlock('cold lamps burn'))).toMatchObject({ ok: true });
    expect(getCloud().token).toMatch(/^[0-9a-f]{64}$/);
    // It can now unlock offline with the same passphrase.
    online = false;
    expect((await unlock('cold lamps burn'))).toMatchObject({ ok: true });
    expect((await unlock('wrong passphrase'))).toMatchObject({ ok: false });
  }, 30_000);

  it('an existing device passphrase becomes the shared one on its first online unlock', async () => {
    const { createLock, saveLock } = await import('../src/domain/passphrase');
    const { unlock } = await import('../src/data/passFlow');
    saveLock((await createLock('my old phone pass')).record);
    const r = await unlock('my old phone pass');
    expect(r).toMatchObject({ ok: true });
    expect((r as { recoveryCode?: string }).recoveryCode).toBeTruthy();
    expect(await (await req('/api/auth/params')).json()).toMatchObject({ configured: true });
  }, 30_000);

  it('a device that never unlocked cannot open the DM view offline', async () => {
    const { unlock, lockConfigured } = await import('../src/data/passFlow');
    const { setCloud } = await import('../src/data/cloud');
    setCloud({ configured: true });
    online = false;
    expect(lockConfigured()).toBe(true);
    expect(await unlock('anything at all')).toMatchObject({ ok: false });
  });

  it('syncs one campaign: upload, download on another device, and nothing lost on a conflict', async () => {
    const { setPassphrase } = await import('../src/data/passFlow');
    const { syncNow, getCloud, setCloud, installChangeTracking, listCopies } = await import('../src/data/cloud');
    installChangeTracking();
    await setPassphrase('cold lamps burn');
    await syncNow();
    expect(getCloud()).toMatchObject({ baseRev: 1, dirty: false });

    // Device A edits an NPC: it uploads.
    await update<NPC>('npcs', 'npc-ilan-rook', { role: 'Edited on the phone' });
    expect(getCloud().dirty).toBe(true);
    await syncNow();
    expect(getCloud()).toMatchObject({ baseRev: 2, dirty: false });

    // Another device uploads version 3 with a different edit.
    const token = getCloud().token!;
    const other = await exportBackup();
    (other.tables.npcs as NPC[]).find((n) => n.id === 'npc-ilan-rook')!.role = 'Edited on the PC';
    await req('/api/sync?base=2', { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: new TextEncoder().encode(JSON.stringify(other)) });

    // Meanwhile this device changed something offline.
    await update<NPC>('npcs', 'npc-tarin', { role: 'Offline edit' });
    await syncNow();
    expect((await db.npcs.get('npc-ilan-rook'))!.role).toBe('Edited on the PC');
    expect(getCloud()).toMatchObject({ baseRev: 3 });
    const copies = await listCopies();
    expect(copies.length).toBe(1);
    expect(copies[0].json).toContain('Offline edit'); // this device's version was kept

    // A brand-new device adopts the server copy.
    setCloud({ baseRev: undefined, dirty: false });
    await wipeAll();
    await applySeed(seedV2());
    await syncNow();
    expect((await db.npcs.get('npc-ilan-rook'))!.role).toBe('Edited on the PC');
  }, 60_000);
});
