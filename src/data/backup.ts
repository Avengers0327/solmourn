// Backup, restore and starter-pack import. A starter pack is simply a backup-format file.
import { db, SCHEMA_VERSION } from './db';
import { newId, nowIso } from './repo';
import { TABLES, CAMPAIGN_ID, type BackupFile, type TableName } from '../domain/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (name: TableName) => (db as any)[name] as import('dexie').Table<Rec, string>;
const keyOf = (name: TableName, r: Rec): string => (name === 'meta' ? r.key : r.id);
export const labelOf = (r: Rec): string => r.title ?? r.name ?? r.topic ?? r.key ?? r.id;

export async function exportBackup(kind: BackupFile['manifest']['kind'] = 'backup'): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {};
  const counts: Record<string, number> = {};
  for (const name of TABLES) {
    const rows = await table(name).toArray();
    tables[name] = rows;
    counts[name] = rows.length;
  }
  return {
    manifest: { app: 'solmourn-companion', kind, formatVersion: 1, schemaVersion: SCHEMA_VERSION, exportedAt: nowIso(), counts },
    tables,
  };
}

export function parseBackup(text: string): BackupFile {
  let data: BackupFile;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (data?.manifest?.app !== 'solmourn-companion' || typeof data.tables !== 'object') {
    throw new Error('That file is not a Solmourn Companion backup or starter pack.');
  }
  if (data.manifest.formatVersion !== 1) throw new Error(`Unsupported backup format version ${data.manifest.formatVersion}.`);
  if (data.manifest.schemaVersion > SCHEMA_VERSION) throw new Error('This backup comes from a newer version of the app. Update the app first.');
  return data;
}

const strip = (r: Rec) => {
  const { updatedAt: _u, revision: _r, ...rest } = r;
  return JSON.stringify(rest);
};

export interface ImportConflict {
  table: TableName;
  key: string;
  label: string;
  mineRevision: number;
}
export interface ImportPreview {
  kind: string;
  exportedAt: string;
  counts: Record<string, number>;
  added: number;
  identical: number;
  updated: number; // local copy never edited, safe to refresh
  conflicts: ImportConflict[]; // local copy was edited by the DM
  hasExistingData: boolean;
}

/** Dry run: what would importing this file do? Nothing is written. */
export async function previewImport(data: BackupFile): Promise<ImportPreview> {
  const p: ImportPreview = {
    kind: data.manifest.kind, exportedAt: data.manifest.exportedAt, counts: {}, added: 0, identical: 0, updated: 0, conflicts: [],
    hasExistingData: (await db.campaigns.count()) > 0,
  };
  for (const name of TABLES) {
    const rows = (data.tables[name] ?? []) as Rec[];
    p.counts[name] = rows.length;
    if (name === 'audit') continue;
    for (const inc of rows) {
      const mine = await table(name).get(keyOf(name, inc));
      if (!mine) p.added++;
      else if (strip(mine) === strip(inc)) p.identical++;
      else if ((mine.revision ?? 1) > 1 && name !== 'meta') {
        p.conflicts.push({ table: name, key: keyOf(name, inc), label: labelOf(mine), mineRevision: mine.revision });
      } else p.updated++;
    }
  }
  return p;
}

export type Resolution = 'mine' | 'incoming' | 'draft';
export interface ImportOptions {
  mode: 'merge' | 'replace';
  /** Per-record choices keyed "table:key"; anything missing uses `fallback`. */
  resolutions?: Record<string, Resolution>;
  fallback?: Resolution;
}

/**
 * Merge never silently overwrites a record the DM edited: each conflict is kept, replaced, or
 * the incoming version is added alongside as a new WORKING draft. Replace wipes everything first.
 */
export async function applyImport(data: BackupFile, opts: ImportOptions): Promise<void> {
  const all = TABLES.map((n) => table(n));
  await db.transaction('rw', all, async () => {
    if (opts.mode === 'replace') for (const t of all) await t.clear();
    for (const name of TABLES) {
      const t = table(name);
      for (const inc of (data.tables[name] ?? []) as Rec[]) {
        const key = keyOf(name, inc);
        const mine = opts.mode === 'replace' ? undefined : await t.get(key);
        if (!mine) {
          await t.put(inc);
          continue;
        }
        if (name === 'audit' || strip(mine) === strip(inc)) continue;
        const edited = (mine.revision ?? 1) > 1 && name !== 'meta';
        const choice: Resolution = edited ? opts.resolutions?.[`${name}:${key}`] ?? opts.fallback ?? 'mine' : 'incoming';
        if (choice === 'incoming') {
          await t.put(inc);
        } else if (choice === 'draft') {
          const draft: Rec = { ...inc, id: newId('draft'), revision: 1, updatedAt: nowIso() };
          if ('title' in draft) draft.title = `${draft.title} (incoming draft)`;
          if ('name' in draft) draft.name = `${draft.name} (incoming draft)`;
          if ('canonStatus' in draft) draft.canonStatus = 'WORKING';
          if ('visibility' in draft) draft.visibility = 'DM_ONLY';
          await t.put(draft);
        }
        if (edited) {
          await db.audit.add({
            id: newId('aud'), campaignId: CAMPAIGN_ID, timestamp: nowIso(), actor: 'IMPORT', eventType: 'import-conflict',
            entityType: name, entityId: key, summary: `Import conflict on "${labelOf(mine)}": ${choice === 'mine' ? 'kept mine' : choice === 'incoming' ? 'used incoming' : 'added incoming as draft'}`,
            beforeJson: JSON.stringify(mine), afterJson: JSON.stringify(inc),
          });
        }
      }
    }
  });
}

export async function wipeAll(): Promise<void> {
  const all = TABLES.map((n) => table(n));
  await db.transaction('rw', all, async () => {
    for (const t of all) await t.clear();
  });
}

/** Hand a file to the iOS share sheet (Save to Files, AirDrop...) or fall back to a download. */
export async function shareFile(filename: string, text: string, mime: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([text], filename, { type: mime });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
