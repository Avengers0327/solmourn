// All writes go through here so that revisions, audit history and undo stay consistent.
import { db } from './db';
import { CAMPAIGN_ID } from '../domain/types';
import type { AuditEvent, Clock, Clue, ClueStatus, EventKind, NPC, NpcStatus, Session, SessionEvent, TableName, Visibility } from '../domain/types';

export const nowIso = () => new Date().toISOString();
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

type ToastFn = (message: string, undo?: () => Promise<void>) => void;
let toast: ToastFn = () => {};
export const setToastHandler = (fn: ToastFn) => (toast = fn);
export const notify = (message: string, undo?: () => Promise<void>) => toast(message, undo);

const AUDITED: TableName[] = ['clocks', 'clues', 'revelations', 'npcs', 'lore', 'locations', 'canonDecisions', 'timeline', 'pcs', 'sessions'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (name: TableName) => (db as any)[name] as import('dexie').Table<any, string>;

async function audit(e: Omit<AuditEvent, 'id' | 'campaignId' | 'timestamp' | 'actor'> & { actor?: AuditEvent['actor'] }) {
  await db.audit.add({ id: newId('aud'), campaignId: CAMPAIGN_ID, timestamp: nowIso(), actor: 'DM', ...e });
}

export interface WriteOpts {
  /** Human summary for the change history + toast. */
  summary?: string;
  /** Show a toast with an Undo button. */
  undoable?: boolean;
  eventType?: string;
}

export async function update<T extends { id: string }>(name: TableName, id: string, patch: Partial<T>, opts: WriteOpts = {}): Promise<void> {
  const t = table(name);
  const before = await t.get(id);
  if (!before) return;
  const after = { ...before, ...patch, updatedAt: nowIso(), revision: (before.revision ?? 0) + 1 };
  await t.put(after);
  if (AUDITED.includes(name) || opts.eventType) {
    await audit({
      eventType: opts.eventType ?? 'update',
      entityType: name,
      entityId: id,
      summary: opts.summary ?? `Edited ${before.title ?? before.name ?? name}`,
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify(after),
    });
  }
  if (opts.undoable) {
    toast(opts.summary ?? 'Saved', async () => {
      await t.put({ ...before, updatedAt: nowIso(), revision: after.revision + 1 });
      await audit({ eventType: 'undo', entityType: name, entityId: id, summary: `Undid: ${opts.summary ?? 'change'}` });
    });
  }
}

export async function create<T extends object>(name: TableName, prefix: string, data: T, opts: WriteOpts = {}): Promise<string> {
  const id = (data as { id?: string }).id ?? newId(prefix);
  const rec = { campaignId: CAMPAIGN_ID, createdAt: nowIso(), updatedAt: nowIso(), revision: 1, ...data, id };
  await table(name).put(rec);
  if (AUDITED.includes(name)) {
    await audit({ eventType: 'create', entityType: name, entityId: id, summary: opts.summary ?? `Created ${name} record`, afterJson: JSON.stringify(rec) });
  }
  if (opts.undoable) toast(opts.summary ?? 'Added', async () => void (await table(name).delete(id)));
  return id;
}

export async function softDelete(name: TableName, id: string, label: string): Promise<void> {
  await update(name, id, { deletedAt: nowIso() } as never, { summary: `Deleted ${label}`, undoable: true, eventType: 'delete' });
}

// ---- Cockpit actions ----
export async function changeClock(clock: Clock, delta: number, reason = ''): Promise<void> {
  const to = Math.max(0, Math.min(clock.max, clock.value + delta));
  if (to === clock.value) return;
  await update<Clock>('clocks', clock.id, {
    value: to,
    reasonHistory: [...clock.reasonHistory, { at: nowIso(), from: clock.value, to, reason }],
  }, { summary: `${clock.name} ${clock.value} → ${to}/${clock.max}`, undoable: true, eventType: 'clock' });
}

/** Mark a clue found at the table and make ONLY its player-safe text shareable. */
export async function revealClue(clue: Clue, sessionId?: string): Promise<void> {
  await update<Clue>('clues', clue.id, {
    status: clue.status === 'NOT_SEEN' || clue.status === 'HINTED' ? 'FOUND' : clue.status,
    visibility: 'REVEALED',
    discoveredSessionId: clue.discoveredSessionId ?? sessionId,
  }, { summary: `Clue found: ${clue.title}`, undoable: true, eventType: 'reveal' });
}
export async function setClueStatus(clue: Clue, status: ClueStatus): Promise<void> {
  await update<Clue>('clues', clue.id, { status }, { summary: `${clue.title}: ${status.replace('_', ' ').toLowerCase()}`, undoable: true, eventType: 'clue-status' });
}
export async function setNpcStatus(npc: NPC, status: NpcStatus): Promise<void> {
  await update<NPC>('npcs', npc.id, { status }, { summary: `${npc.name} marked ${status.toLowerCase()}`, undoable: true, eventType: 'npc-status' });
}

export async function addEvent(sessionId: string, kind: EventKind, textMd: string, visibility: Visibility = 'DM_ONLY', linkedEntityIds: string[] = []): Promise<string> {
  return create<Partial<SessionEvent>>('events', 'evt', { sessionId, kind, textMd, visibility, linkedEntityIds, happenedAt: nowIso(), resolved: false }, { summary: 'Note saved', undoable: true });
}

export async function setSessionStatus(s: Session, status: Session['status']): Promise<void> {
  const patch: Partial<Session> = { status };
  if (status === 'ACTIVE' && !s.startedAt) patch.startedAt = nowIso();
  if (status === 'COMPLETE') patch.endedAt = nowIso();
  await update<Session>('sessions', s.id, patch, { summary: `Session ${s.index} ${status.toLowerCase()}`, undoable: true, eventType: 'session-status' });
  if (status === 'ACTIVE') await db.campaigns.update(CAMPAIGN_ID, { currentSessionId: s.id });
}
export const setCurrentSession = (id: string) => db.campaigns.update(CAMPAIGN_ID, { currentSessionId: id });

export async function setScene(session: Session, sceneId: string): Promise<void> {
  const scenes = await db.scenes.where('sessionId').equals(session.id).toArray();
  const target = scenes.find((s) => s.id === sceneId);
  await db.transaction('rw', db.scenes, db.sessions, async () => {
    for (const s of scenes) {
      const status = s.id === sceneId ? 'ACTIVE' : target && s.sequence < target.sequence ? 'DONE' : 'PENDING';
      if (s.status !== status) await db.scenes.update(s.id, { status });
    }
    await db.sessions.update(session.id, { currentSceneId: sceneId });
  });
}

export const getMeta = async <T,>(key: string): Promise<T | undefined> => (await db.meta.get(key))?.value as T | undefined;
export const setMeta = (key: string, value: unknown) => db.meta.put({ key, value });
