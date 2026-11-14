// Cloud sync for a single DM: one passphrase and one campaign shared by every device that opens
// the deployed site (phone, PC, Home Screen app, browser tab). The app still works fully offline;
// changes upload when the device is back online.
//
// Model: the server keeps one snapshot (a normal backup file) with a revision number. A device
// remembers the revision its data came from. Upload succeeds only if nobody uploaded in between;
// otherwise this device's copy is saved aside (never lost) and the newer server copy is used.
import Dexie, { type Table } from 'dexie';
import { db } from './db';
import { applyImport, exportBackup, parseBackup } from './backup';
import { ensureSeed } from './ensureSeed';
import { derive, hex, normalizeRecovery, randomBytes, ITERATIONS } from '../domain/passphrase';
import { TABLES } from '../domain/types';

// ---------------- device state ----------------
const KEY = 'solmourn.cloud';
export interface CloudState {
  /** The server said a shared passphrase exists (remembered so an offline device still asks for it). */
  configured?: boolean;
  token?: string;
  /** Server revision this device's data matches. Undefined = never synced. */
  baseRev?: number;
  /** Local changes not yet uploaded. */
  dirty?: boolean;
  lastSyncAt?: string;
}
export const getCloud = (): CloudState => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
};
export const setCloud = (patch: Partial<CloudState>) => localStorage.setItem(KEY, JSON.stringify({ ...getCloud(), ...patch }));

// ---------------- API ----------------
export interface AuthParams {
  app: 'solmourn';
  configured: boolean;
  salt?: string;
  iterations?: number;
  recoverySalt?: string;
  resetAvailable?: boolean;
}
export class CloudError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call(path: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const token = getCloud().token;
    const headers = new Headers(init.headers);
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    return await fetch(`/api/${path}`, { ...init, headers, signal: ctl.signal, cache: 'no-store' });
  } finally {
    clearTimeout(t);
  }
}
async function callJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await call(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new CloudError(res.status, data.error ?? `Server error ${res.status}`);
  return data as T;
}
const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/**
 * Asks the server for the passphrase settings. Null means there is no Solmourn server here
 * (offline, local preview, or a static host): the app then works on this device only.
 */
export async function getParams(timeoutMs = 4000): Promise<AuthParams | null> {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    const res = await call('auth/params', {}, timeoutMs);
    if (!res.ok || !(res.headers.get('Content-Type') ?? '').includes('json')) return null;
    const p = (await res.json()) as AuthParams;
    if (p?.app !== 'solmourn') return null;
    setCloud({ configured: p.configured });
    return p;
  } catch {
    return null;
  }
}

async function newSecret(passphrase: string, recoveryCode: string) {
  const salt = hex(randomBytes(16));
  const recoverySalt = hex(randomBytes(16));
  return {
    salt, recoverySalt, iterations: ITERATIONS,
    authKey: await derive(passphrase, salt, ITERATIONS),
    recoveryKey: await derive(normalizeRecovery(recoveryCode), recoverySalt, ITERATIONS),
  };
}
function signedIn(token: string) {
  setCloud({ token, configured: true });
}

/** Check the passphrase with the server. Returns 'ok', or throws CloudError (401 wrong, 429 too many). */
export async function cloudLogin(params: AuthParams, passphrase: string): Promise<void> {
  const authKey = await derive(passphrase, params.salt!, params.iterations!);
  signedIn((await callJson<{ token: string }>('auth/login', post({ authKey }))).token);
}
/** First device: make this the shared passphrase. */
export async function cloudSetup(passphrase: string, recoveryCode: string): Promise<void> {
  signedIn((await callJson<{ token: string }>('auth/setup', post(await newSecret(passphrase, recoveryCode)))).token);
}
/** Change the shared passphrase (this device must be signed in). Other devices must unlock again. */
export async function cloudChange(passphrase: string, recoveryCode: string): Promise<void> {
  signedIn((await callJson<{ token: string }>('auth/change', post(await newSecret(passphrase, recoveryCode)))).token);
}
/** Forgotten passphrase: prove the old recovery code, set a new passphrase and recovery code. */
export async function cloudRecover(params: AuthParams, oldCode: string, passphrase: string, recoveryCode: string): Promise<void> {
  const proof = await derive(normalizeRecovery(oldCode), params.recoverySalt!, params.iterations!);
  signedIn((await callJson<{ token: string }>('auth/recover', post({ proof, ...(await newSecret(passphrase, recoveryCode)) }))).token);
}
/** Last resort, enabled by the RESET_PASSPHRASE secret in Cloudflare. Campaign data is kept. */
export async function cloudReset(secret: string): Promise<void> {
  await callJson('auth/reset', post({ secret }));
  setCloud({ token: undefined, configured: false });
}
export const getReadKey = async () => (await callJson<{ readKey: string }>('readkey')).readKey;
export const rotateReadKey = async () => (await callJson<{ readKey: string }>('readkey/rotate', { method: 'POST' })).readKey;
export const feedUrl = (key: string) => `${location.origin}/api/dm/${key}`;

// ---------------- saved copies (never lose a device's data) ----------------
interface SavedCopy { id?: number; savedAt: string; reason: string; json: string }
class CopiesDB extends Dexie {
  copies!: Table<SavedCopy, number>;
  constructor() {
    super('solmourn-saved-copies');
    this.version(1).stores({ copies: '++id, savedAt' });
  }
}
export const copiesDb = new CopiesDB();
async function saveCopy(reason: string) {
  const json = JSON.stringify(await exportBackup('backup'));
  await copiesDb.copies.add({ savedAt: new Date().toISOString(), reason, json });
  const all = await copiesDb.copies.orderBy('savedAt').primaryKeys();
  if (all.length > 5) await copiesDb.copies.bulkDelete(all.slice(0, all.length - 5));
}

// ---------------- change tracking ----------------
let suppress = 0;
let changeCounter = 0;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let hooksInstalled = false;

/** Mark local data as changed whenever the app writes to the campaign database. */
export function installChangeTracking() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  const touched = () => {
    if (suppress) return;
    changeCounter++;
    if (!getCloud().dirty) setCloud({ dirty: true });
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void syncNow('change'), 2500);
  };
  for (const name of TABLES) {
    const t = db.table(name);
    t.hook('creating', touched);
    t.hook('updating', touched);
    t.hook('deleting', touched);
  }
}

// ---------------- status for the UI ----------------
export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'error' | 'signed-out';
export interface SyncStatus { state: SyncState; message?: string; lastSyncAt?: string; rev?: number; /** The server rejected this device: ask for the passphrase again. */ relock?: boolean }
let status: SyncStatus = { state: 'off' };
const listeners = new Set<(s: SyncStatus) => void>();
export const getSyncStatus = () => status;
export function onSyncStatus(fn: (s: SyncStatus) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
function setStatus(s: SyncStatus) {
  status = s;
  for (const fn of listeners) fn(s);
}

// ---------------- compression ----------------
async function gzip(text: string): Promise<{ bytes: Uint8Array; encoding: 'gzip' | 'identity' }> {
  const raw = new TextEncoder().encode(text);
  if (typeof CompressionStream === 'undefined') return { bytes: raw, encoding: 'identity' };
  const stream = new Blob([raw as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'));
  return { bytes: new Uint8Array(await new Response(stream).arrayBuffer()), encoding: 'gzip' };
}
async function gunzip(bytes: ArrayBuffer, encoding: string): Promise<string> {
  if (encoding !== 'gzip') return new TextDecoder().decode(bytes);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

// ---------------- the sync step ----------------
async function hasOwnWork(): Promise<boolean> {
  return (await db.pcs.count()) > 0 || (await db.events.count()) > 0 || (await db.audit.filter((a) => a.actor === 'DM').count()) > 0;
}

async function pull(): Promise<number> {
  const res = await call('sync', {}, 60_000);
  if (res.status === 401) throw new CloudError(401, 'Unlock again.');
  if (!res.ok && res.status !== 204) throw new CloudError(res.status, `Download failed (${res.status})`);
  const rev = Number(res.headers.get('X-Rev') ?? 0);
  if (res.status === 204) return 0;
  const data = parseBackup(await gunzip(await res.arrayBuffer(), res.headers.get('X-Encoding') ?? 'identity'));
  suppress++;
  try {
    await applyImport(data, { mode: 'replace' });
  } finally {
    suppress--;
  }
  setCloud({ baseRev: rev, dirty: false, lastSyncAt: new Date().toISOString() });
  // The server copy may come from an older app version: bring it up to date (this may upload).
  await ensureSeed();
  return rev;
}

async function push(base: number): Promise<'ok' | 'conflict'> {
  const startedAt = changeCounter;
  const { bytes, encoding } = await gzip(JSON.stringify(await exportBackup('backup')));
  const res = await call(`sync?base=${base}`, { method: 'PUT', headers: { 'X-Encoding': encoding, 'Content-Type': 'application/octet-stream' }, body: bytes as BodyInit }, 60_000);
  if (res.status === 409) return 'conflict';
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new CloudError(res.status, data.error ?? `Upload failed (${res.status})`);
  // Changes made while uploading stay marked and go up next time.
  setCloud({ baseRev: data.rev, dirty: changeCounter !== startedAt, lastSyncAt: data.updatedAt });
  return 'ok';
}

async function step(): Promise<void> {
  const c = getCloud();
  const meta = await callJson<{ rev: number }>('sync/meta');
  if (c.baseRev === undefined) {
    // First sync on this device.
    if (meta.rev === 0) {
      if ((await push(0)) === 'conflict') return step();
      return;
    }
    if (await hasOwnWork()) await saveCopy('This device\'s data before it first synced');
    await pull();
    return;
  }
  if (meta.rev === c.baseRev) {
    if (c.dirty && (await push(c.baseRev)) === 'conflict') return step();
    return;
  }
  // Someone else (another device) uploaded since this device last synced.
  if (c.dirty) await saveCopy('Changes on this device that conflicted with a newer upload');
  await pull();
}

let running: Promise<void> | null = null;
let again = false;
/** Bring this device and the server in line. Safe to call often; calls are queued, never parallel. */
export async function syncNow(_reason = ''): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      const c = getCloud();
      if (!c.token) {
        setStatus(c.configured ? { state: 'signed-out', lastSyncAt: c.lastSyncAt, message: 'Lock the app and unlock it while online to resume syncing.' } : { state: 'off' });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setStatus({ state: 'offline', lastSyncAt: c.lastSyncAt, message: c.dirty ? 'Changes will upload when you are back online.' : undefined });
        return;
      }
      setStatus({ ...status, state: 'syncing' });
      try {
        await step();
        const after = getCloud();
        setStatus({ state: 'idle', lastSyncAt: after.lastSyncAt, rev: after.baseRev });
      } catch (e) {
        if (e instanceof CloudError && e.status === 401) {
          setCloud({ token: undefined });
          setStatus({ state: 'signed-out', relock: true, message: 'The passphrase was changed on another device, or this device was signed out. Unlock again.' });
          return;
        }
        const offline = !(e instanceof CloudError);
        setStatus({ state: offline ? 'offline' : 'error', lastSyncAt: getCloud().lastSyncAt, message: offline ? 'Could not reach the server. Changes are kept on this device.' : (e as Error).message });
        return;
      }
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Saved copies, newest first, for the Settings screen. */
export const listCopies = () => copiesDb.copies.orderBy('savedAt').reverse().toArray();
