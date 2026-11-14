// App-owned seed records: versioned, idempotent, transactional, and non-destructive.
//
// Rules (Story Bible §15):
//  - a record the DM never edited is updated in place;
//  - play state (statuses, reveals, clock values, notes, choices) is NEVER overwritten;
//  - sessions already played, and clues/revelations already found, are frozen as history;
//  - a record whose text the DM edited is kept, and the new version is surfaced as a collision;
//  - seed records that no longer exist are retired only if untouched; otherwise kept as legacy.
// Everything happens in one transaction: an interrupted upgrade leaves the data exactly as it was.
import { db } from './db';
import { CAMPAIGN_ID, TABLES, type TableName } from '../domain/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Rec = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (name: TableName) => (db as any)[name] as import('dexie').Table<Rec, string>;

/** Fields the DM owns through play. The seed sets them on insert and never touches them again. */
export const USER_STATE: Partial<Record<TableName, string[]>> = {
  campaigns: ['currentSessionId', 'settings'],
  sessions: ['status', 'startedAt', 'endedAt', 'currentSceneId', 'dmNotesMd', 'playerRecapMd', 'visibility'],
  scenes: ['status'],
  clues: ['status', 'visibility', 'discoveredSessionId', 'discoveredBy'],
  revelations: ['status', 'visibility'],
  npcs: ['status', 'visibility', 'lastSeen', 'relationship'],
  locations: ['visibility'],
  lore: ['visibility'],
  timeline: ['visibility'],
  clocks: ['value', 'reasonHistory'],
  canonDecisions: ['selectedOption', 'status'],
  branches: ['chosenOptionId', 'chosenAt', 'notesMd'],
  lessons: ['done'],
};
const BOOKKEEPING = ['campaignId', 'createdAt', 'updatedAt', 'revision', 'deletedAt'];
const SEEDED: TableName[] = TABLES.filter((t) => !['audit', 'meta', 'pcs', 'events', 'encounters', 'trials'].includes(t));

const stable = (v: unknown): string =>
  v === null || typeof v !== 'object'
    ? JSON.stringify(v) ?? 'null'
    : Array.isArray(v)
      ? `[${v.map(stable).join(',')}]`
      : `{${Object.keys(v as Rec).sort().filter((k) => (v as Rec)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable((v as Rec)[k])}`).join(',')}}`;
function fnv(s: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
export function contentOf(name: TableName, rec: Rec): Rec {
  const skip = new Set([...BOOKKEEPING, ...(USER_STATE[name] ?? [])]);
  return Object.fromEntries(Object.entries(rec).filter(([k]) => !skip.has(k)));
}
export function contentHash(name: TableName, rec: Rec): string {
  const s = stable(contentOf(name, rec));
  return fnv(s, 2166136261) + fnv(s, 0x9747b28c);
}
const labelOf = (r: Rec): string => r.title ?? r.name ?? r.topic ?? r.id;

export interface SeedBundle {
  version: number;
  tables: Partial<Record<TableName, Rec[]>>;
  /** Seed meta records (rule configs). Never includes device or play state. */
  meta?: { key: string; value: unknown }[];
  /** Content hashes of the previous import-based starter pack, for upgrading old installs. */
  legacyBaseline?: Record<string, string>;
}
export interface SeedItem { table: TableName; id: string; label: string; why: string }
export interface SeedCollision extends SeedItem { incoming: Rec }
export interface SeedReport {
  version: number;
  fromVersion: number;
  appliedAt: string;
  inserted: number;
  updated: number;
  unchanged: number;
  retired: number;
  frozen: SeedItem[];
  legacyKept: SeedItem[];
  collisions: SeedCollision[];
}

export const getSeedVersion = async (): Promise<number> => ((await db.meta.get('seedVersion'))?.value as number | undefined) ?? 0;
export const getSeedReport = async (): Promise<SeedReport | undefined> => (await db.meta.get('seedReport'))?.value as SeedReport | undefined;

/**
 * Apply a seed bundle. Safe to call on every launch: a matching version is a no-op.
 * `failAfterWrites` exists only so tests can prove an interrupted upgrade rolls back.
 */
export async function applySeed(bundle: SeedBundle, failAfterWrites = Infinity): Promise<SeedReport> {
  const all = TABLES.map((n) => table(n));
  return db.transaction('rw', all, async () => {
    const fromVersion = await getSeedVersion();
    if (fromVersion === bundle.version) {
      const prior = await getSeedReport();
      if (prior) return prior;
    }
    const now = new Date().toISOString();
    const hasCampaign = (await db.campaigns.count()) > 0;
    const stored = (await db.meta.get('seedBaseline'))?.value as Record<string, string> | undefined;
    const baseline: Record<string, string> = stored ?? (hasCampaign ? bundle.legacyBaseline ?? {} : {});
    const nextBaseline: Record<string, string> = {};
    const report: SeedReport = { version: bundle.version, fromVersion, appliedAt: now, inserted: 0, updated: 0, unchanged: 0, retired: 0, frozen: [], legacyKept: [], collisions: [] };

    let writes = 0;
    const wrote = () => {
      if (++writes > failAfterWrites) throw new Error('Simulated interruption during seed upgrade');
    };

    // Sessions that have been played are history, and so is anything found in them.
    const played = new Set((await db.sessions.toArray()).filter((s) => s.status !== 'PLANNED').map((s) => s.id));
    const frozenWhy = (name: TableName, rec: Rec): string | null => {
      if (name === 'sessions' && played.has(rec.id)) return 'session already played';
      if (name === 'scenes' && played.has(rec.sessionId)) return 'scene of a played session';
      if (name === 'clues' && (rec.status !== 'NOT_SEEN' || rec.discoveredSessionId)) return 'clue already in play';
      if (name === 'revelations' && rec.status !== 'NOT_SEEN') return 'revelation already in play';
      if (name === 'branches' && rec.chosenOptionId) return 'choice already made';
      return null;
    };

    for (const name of SEEDED) {
      for (const rec of bundle.tables[name] ?? []) {
        const key = `${name}:${rec.id}`;
        const newHash = contentHash(name, rec);
        nextBaseline[key] = newHash;
        const existing = await table(name).get(rec.id);
        if (!existing) {
          await table(name).put({ campaignId: CAMPAIGN_ID, createdAt: now, updatedAt: now, revision: 1, ...rec });
          wrote();
          report.inserted++;
          continue;
        }
        if (existing.deletedAt) { report.unchanged++; continue; } // the DM deleted it: respect that
        const curHash = contentHash(name, existing);
        if (curHash === newHash) { report.unchanged++; continue; }
        const why = frozenWhy(name, existing);
        if (why) { report.frozen.push({ table: name, id: rec.id, label: labelOf(existing), why }); nextBaseline[key] = baseline[key] ?? curHash; continue; }
        const base = baseline[key];
        const untouched = base !== undefined ? curHash === base : (existing.revision ?? 1) === 1;
        if (untouched) {
          // Update seed-owned content in place; keep every play-state field and bookkeeping value.
          await table(name).put({ ...existing, ...contentOf(name, rec), updatedAt: now });
          wrote();
          report.updated++;
        } else if (base !== undefined && newHash === base) {
          report.unchanged++; // the DM edited it and the seed did not change: nothing to reconcile
        } else {
          report.collisions.push({ table: name, id: rec.id, label: labelOf(existing), why: 'you edited this record and the canon seed changed', incoming: rec });
          nextBaseline[key] = base ?? curHash;
        }
      }
    }

    // Seed records that no longer exist in this version.
    for (const key of Object.keys(baseline)) {
      if (key in nextBaseline) continue;
      const [name, ...rest] = key.split(':') as [TableName, ...string[]];
      const id = rest.join(':');
      if (!SEEDED.includes(name)) continue;
      const existing = await table(name).get(id);
      if (!existing || existing.deletedAt) continue;
      const why = frozenWhy(name, existing);
      if (why) { report.legacyKept.push({ table: name, id, label: labelOf(existing), why }); continue; }
      if (contentHash(name, existing) === baseline[key]) {
        await table(name).put({ ...existing, deletedAt: now, updatedAt: now });
        wrote();
        report.retired++;
      } else {
        report.legacyKept.push({ table: name, id, label: labelOf(existing), why: 'superseded by the canon upgrade, but you edited it' });
      }
    }

    for (const m of bundle.meta ?? []) { await db.meta.put(m); wrote(); }
    await db.meta.bulkPut([
      { key: 'seedVersion', value: bundle.version },
      { key: 'seedBaseline', value: nextBaseline },
      { key: 'seedReport', value: report },
    ]);
    await db.audit.add({
      id: `aud-seed-${bundle.version}-${now}`, campaignId: CAMPAIGN_ID, timestamp: now, actor: 'IMPORT', eventType: 'seed-upgrade', entityType: 'campaign', entityId: CAMPAIGN_ID,
      summary: `Canon seed v${fromVersion} → v${bundle.version}: ${report.inserted} added, ${report.updated} updated, ${report.retired} retired, ${report.frozen.length + report.legacyKept.length} kept as played/legacy, ${report.collisions.length} collisions`,
    });
    return report;
  });
}

/** Resolve one collision from the upgrade report. Nothing is replaced without this explicit choice. */
export async function resolveCollision(c: SeedCollision, choice: 'mine' | 'incoming' | 'draft'): Promise<void> {
  const all = [table(c.table), db.meta, db.audit];
  await db.transaction('rw', all, async () => {
    const now = new Date().toISOString();
    const existing = await table(c.table).get(c.id);
    if (existing && choice === 'incoming') {
      await table(c.table).put({ ...existing, ...contentOf(c.table, c.incoming), updatedAt: now, revision: (existing.revision ?? 1) + 1 });
      const baseline = ((await db.meta.get('seedBaseline'))?.value as Record<string, string>) ?? {};
      baseline[`${c.table}:${c.id}`] = contentHash(c.table, c.incoming);
      await db.meta.put({ key: 'seedBaseline', value: baseline });
    } else if (choice === 'draft') {
      const draft: Rec = { campaignId: CAMPAIGN_ID, createdAt: now, updatedAt: now, revision: 1, ...c.incoming, id: `draft-${crypto.randomUUID()}`, canonStatus: 'WORKING', visibility: 'DM_ONLY' };
      if ('title' in draft) draft.title = `${draft.title} (canon upgrade draft)`;
      if ('name' in draft) draft.name = `${draft.name} (canon upgrade draft)`;
      await table(c.table).put(draft);
    }
    const report = await getSeedReport();
    if (report) await db.meta.put({ key: 'seedReport', value: { ...report, collisions: report.collisions.filter((x) => !(x.table === c.table && x.id === c.id)) } });
    await db.audit.add({
      id: `aud-${crypto.randomUUID()}`, campaignId: CAMPAIGN_ID, timestamp: now, actor: 'DM', eventType: 'seed-collision', entityType: c.table, entityId: c.id,
      summary: `Canon upgrade collision on "${c.label}": ${choice === 'mine' ? 'kept mine' : choice === 'incoming' ? 'used the new canon text' : 'added the new text as a draft'}`,
      beforeJson: JSON.stringify(existing), afterJson: JSON.stringify(c.incoming),
    });
  });
}
