// Native preload, seed upgrades and durability:
// fresh install, upgrade of edited eight-session data, interrupted migration, relaunch,
// backup/restore, and no duplicate records or orphan links.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { seedV2 } from './fixtures/seedV2';
import { buildPack as packV1 } from './fixtures/seedV1';
import { loadDocs as docsV1 } from './fixtures/loadDocsV1';
import { applyImport, exportBackup, parseBackup, wipeAll } from '../src/data/backup';
import { db } from '../src/data/db';
import { addEvent, changeClock, create, revealClue, setSessionStatus, softDelete, update } from '../src/data/repo';
import { applySeed, getSeedReport, getSeedVersion, resolveCollision } from '../src/data/seedEngine';
import { blankPc } from '../src/data/blank';
import { TABLES, type Branch, type Clue, type LoreEntry, type NPC, type Scene, type Session } from '../src/domain/types';

const counts = async () => Object.fromEntries(await Promise.all(TABLES.map(async (t) => [t, await (db as never as Record<string, { count(): Promise<number> }>)[t].count()])));
const liveCount = async (t: string) => (await (db as never as Record<string, { toArray(): Promise<{ deletedAt?: string }[]> }>)[t].toArray()).filter((r) => !r.deletedAt).length;
const installV1 = async () => { await applyImport(packV1(docsV1()), { mode: 'merge' }); };

beforeEach(async () => { await wipeAll(); });

describe('fresh install (no import step)', () => {
  it('seeds the whole campaign and opens at Session 1, unstarted', async () => {
    const r = await applySeed(seedV2());
    expect(r).toMatchObject({ fromVersion: 0, version: 4, updated: 0, retired: 0, collisions: [] });
    expect(await db.sessions.count()).toBe(15);
    const c = await db.campaigns.get('solmourn');
    expect(c!.title).toBe('Solmourn: The Dying Light');
    expect(await db.sessions.get(c!.currentSessionId!)).toMatchObject({ index: 1, title: 'Blackout in Frostward', status: 'PLANNED' });
    expect(await db.locations.where('id').startsWith('loc-ember-').count()).toBe(8);
    expect(await db.lessons.count()).toBeGreaterThanOrEqual(14);
    expect(await db.branches.count()).toBeGreaterThanOrEqual(15);
    expect(await db.statCards.count()).toBeGreaterThanOrEqual(15);
    expect(await db.pcs.count()).toBe(0);
    expect(await getSeedVersion()).toBe(4);
  });
  it('relaunch is a no-op: no duplicates, nothing rewritten', async () => {
    await applySeed(seedV2());
    const before = await counts();
    const audit = await db.audit.count();
    const again = await applySeed(seedV2());
    expect(again.inserted).toBeGreaterThan(0); // returns the stored report, does no work
    expect(await counts()).toEqual(before);
    expect(await db.audit.count()).toBe(audit);
  });
  it('has no orphan links', async () => {
    await applySeed(seedV2());
    const sessionIds = new Set((await db.sessions.toArray()).map((s) => s.id));
    const revIds = new Set((await db.revelations.toArray()).map((r) => r.id));
    const locIds = new Set((await db.locations.toArray()).map((l) => l.id));
    for (const s of await db.scenes.toArray()) expect(sessionIds.has(s.sessionId), s.id).toBe(true);
    for (const c of await db.clues.toArray()) for (const r of c.revelationIds) expect(revIds.has(r), `${c.id}→${r}`).toBe(true);
    for (const l of await db.locations.toArray()) if (l.parentLocationId) expect(locIds.has(l.parentLocationId), l.id).toBe(true);
    for (const s of await db.sessions.toArray()) if (s.currentSceneId) expect(await db.scenes.get(s.currentSceneId), s.id).toBeTruthy();
    const indexes = new Set((await db.sessions.toArray()).map((s) => s.index));
    for (const b of await db.branches.toArray()) expect(indexes.has(b.sessionIndex), b.id).toBe(true);
  });
});

describe('upgrade of an untouched eight-session install', () => {
  it('replaces the old canon in place and retires superseded records', async () => {
    await installV1();
    expect(await db.sessions.count()).toBe(8);
    const r = await applySeed(seedV2());
    expect(r.fromVersion).toBe(0);
    expect(r.collisions).toEqual([]);
    expect(r.frozen).toEqual([]);
    expect(await db.sessions.count()).toBe(15);
    expect((await db.sessions.get('ses-4'))!.title).toBe('Beneath the Foundries'); // was "The City Before"
    expect((await db.sessions.get('ses-1'))!.prepMd).toMatch(/WORKING prep card/);
    // retired: the eight-sun lore, the old city roster, the rule that flagged "Cinders"
    expect((await db.lore.get('lore-eight'))!.deletedAt).toBeTruthy();
    expect((await db.locations.get('loc-city-vesperdeep'))!.deletedAt).toBeTruthy();
    expect(((await db.canonRules.get('rule-cinders')) as { deletedAt?: string }).deletedAt).toBeTruthy();
    expect((await db.canonDecisions.get('dec-collective-name'))!.deletedAt).toBeTruthy();
    expect(r.retired).toBeGreaterThan(40);
    expect(await liveCount('npcs')).toBe(18);
    // no duplicate people
    const names = (await db.npcs.toArray()).filter((n) => !n.deletedAt).map((n) => n.name);
    expect(new Set(names).size).toBe(names.length);
    expect((await db.npcs.get('npc-mara'))!.privateInfoMd).toMatch(/Cinder Network coordinator/);
    expect((await db.npcs.get('npc-tomas'))!.canonStatus).toBe('RETIRED');
    expect((await db.npcs.get('npc-tomas'))!.deletedAt).toBeUndefined(); // kept as history
    expect((await db.sessions.get('ses-1'))!.title).toBe('Blackout in Frostward');
  });
});

describe('upgrade of an EDITED and PLAYED eight-session install', () => {
  const play = async () => {
    await installV1();
    await update<NPC>('npcs', 'npc-mara', { wants: 'MY EDIT: her brother back, whatever it costs' });
    await update<LoreEntry>('lore', 'lore-eight', { bodyMd: 'MY EDIT to old lore' });
    await setSessionStatus((await db.sessions.get('ses-1'))!, 'ACTIVE');
    await update<Session>('sessions', 'ses-1', { dmNotesMd: 'MY SESSION NOTES', playerRecapMd: 'We survived the dark.' });
    await setSessionStatus((await db.sessions.get('ses-1'))!, 'COMPLETE');
    await addEvent('ses-1', 'EVENT', 'The party rescued six workers.');
    await changeClock((await db.clocks.get('clk-ors'))!, 1, 'Loud break-in');
    await revealClue((await db.clues.get('clu-joren'))!, 'ses-1');
    await update<Clue>('clues', 'clu-transit-map', { status: 'HINTED' }); // an old clue already in play
    await create('pcs', 'pc', { ...blankPc(), id: 'pc-rin', name: 'Rin' });
    await softDelete('npcs', 'npc-joren', 'Joren');
  };

  it('preserves notes, characters, clocks, reveals, session history and edits', async () => {
    await play();
    const r = await applySeed(seedV2());

    // played session 1 is frozen exactly as it was run
    const s1 = (await db.sessions.get('ses-1'))!;
    expect(s1).toMatchObject({ status: 'COMPLETE', dmNotesMd: 'MY SESSION NOTES', playerRecapMd: 'We survived the dark.' });
    expect(r.frozen.some((f) => f.table === 'sessions' && f.id === 'ses-1')).toBe(true);
    const s1Scenes = (await db.scenes.where('sessionId').equals('ses-1').toArray()) as Scene[];
    expect(s1Scenes.find((s) => s.id === 'scn-1-3')!.title).toBe('Investigation: Joren, site perimeter, ration office'); // v1 text kept

    // unplayed sessions move to the new canon
    expect(await db.sessions.count()).toBe(15);
    expect((await db.sessions.get('ses-6'))!.title).toBe('The Mercy Decree');

    // play state survives
    expect((await db.pcs.get('pc-rin'))!.name).toBe('Rin');
    expect((await db.events.toArray()).some((e) => e.textMd === 'The party rescued six workers.')).toBe(true);
    expect((await db.clocks.get('clk-ors'))!).toMatchObject({ value: 1, reasonHistory: [{ from: 0, to: 1, reason: 'Loud break-in' }] });
    expect((await db.clocks.get('clk-ors'))!.name).toBe('ORS scrutiny');
    expect((await db.clues.get('clu-joren'))!).toMatchObject({ status: 'FOUND', visibility: 'REVEALED', discoveredSessionId: 'ses-1' });

    // a clue already in play is kept as legacy, not deleted
    expect((await db.clues.get('clu-transit-map'))!.deletedAt).toBeUndefined();
    expect(r.legacyKept.some((f) => f.id === 'clu-transit-map')).toBe(true);

    // an edited record is NOT overwritten: it becomes a collision to resolve
    expect((await db.npcs.get('npc-mara'))!.wants).toBe('MY EDIT: her brother back, whatever it costs');
    expect(r.collisions.map((c) => c.id)).toContain('npc-mara');
    // an edited record the new canon dropped is kept and reported
    expect((await db.lore.get('lore-eight'))!).toMatchObject({ bodyMd: 'MY EDIT to old lore' });
    expect((await db.lore.get('lore-eight'))!.deletedAt).toBeUndefined();
    expect(r.legacyKept.some((f) => f.id === 'lore-eight')).toBe(true);
    // a record the DM deleted stays deleted
    expect((await db.npcs.get('npc-joren'))!.deletedAt).toBeTruthy();
  });

  it('collisions are resolved only by an explicit choice, and logged', async () => {
    await play();
    await applySeed(seedV2());
    const c = (await getSeedReport())!.collisions.find((x) => x.id === 'npc-mara')!;
    await resolveCollision(c, 'draft');
    expect((await db.npcs.get('npc-mara'))!.wants).toBe('MY EDIT: her brother back, whatever it costs');
    const draft = (await db.npcs.toArray()).find((n) => n.name.includes('(canon upgrade draft)'))!;
    expect(draft).toMatchObject({ visibility: 'DM_ONLY', canonStatus: 'WORKING' });
    expect((await getSeedReport())!.collisions.some((x) => x.id === 'npc-mara')).toBe(false);
    expect((await db.audit.toArray()).some((a) => a.eventType === 'seed-collision')).toBe(true);
  });

  it('"use new" replaces the text but still keeps play state', async () => {
    await play();
    await update<NPC>('npcs', 'npc-mara', { status: 'ALLY' });
    await applySeed(seedV2());
    const c = (await getSeedReport())!.collisions.find((x) => x.id === 'npc-mara')!;
    await resolveCollision(c, 'incoming');
    expect((await db.npcs.get('npc-mara'))!).toMatchObject({ status: 'ALLY', role: 'Frostward organizer' });
  });

  it('relaunch after the upgrade changes nothing', async () => {
    await play();
    await applySeed(seedV2());
    const before = await counts();
    const snapshot = JSON.stringify(await db.npcs.toArray());
    await applySeed(seedV2());
    expect(await counts()).toEqual(before);
    expect(JSON.stringify(await db.npcs.toArray())).toBe(snapshot);
  });
});

describe('upgrade of a human-only save to the Divergence seed', () => {
  it('keeps existing human PCs valid and unchanged, adds the amendment, and duplicates nothing', async () => {
    await applySeed({ ...seedV2(), version: 2 });
    await create('pcs', 'pc', { ...blankPc(), id: 'pc-old', name: 'Rin', ancestry: 'Human', species: undefined });
    await update<NPC>('npcs', 'npc-mara', { status: 'ALLY', lastSeen: 'Ration plaza' });
    const before = JSON.stringify(await db.pcs.get('pc-old'));
    const r = await applySeed(seedV2());
    expect(r.fromVersion).toBe(2);
    expect(JSON.stringify(await db.pcs.get('pc-old'))).toBe(before);
    expect((await db.npcs.get('npc-mara'))!).toMatchObject({ status: 'ALLY', lastSeen: 'Ration plaza' });
    const ids = (await db.lore.toArray()).map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(await db.lore.get('div-1')).toBeTruthy();
    expect(await db.docs.get('doc-amendment-001')).toBeTruthy();
  });
});

describe('interrupted migration', () => {
  it('rolls back completely and can be retried', async () => {
    await installV1();
    await update<NPC>('npcs', 'npc-mara', { wants: 'MY EDIT' });
    const before = JSON.stringify(await exportBackup());
    await expect(applySeed(seedV2(), 25)).rejects.toThrow(/interruption/);
    const after = await exportBackup();
    expect(JSON.stringify({ ...after, manifest: 0 })).toBe(JSON.stringify({ ...JSON.parse(before), manifest: 0 }));
    expect(await getSeedVersion()).toBe(0);
    expect(await db.sessions.count()).toBe(8);
    const r = await applySeed(seedV2());
    expect(r.version).toBe(4);
    expect(await db.sessions.count()).toBe(15);
    expect((await db.npcs.get('npc-mara'))!.wants).toBe('MY EDIT');
  });
  it('a fresh install interrupted midway leaves an empty database, not half a campaign', async () => {
    await expect(applySeed(seedV2(), 10)).rejects.toThrow();
    expect(await db.sessions.count()).toBe(0);
    expect(await db.campaigns.count()).toBe(0);
  });
});

describe('edits made after the upgrade survive the next seed version', () => {
  it('updates untouched records, keeps edited ones, never touches choices or lesson progress', async () => {
    await applySeed(seedV2());
    await update<NPC>('npcs', 'npc-tarin', { wants: 'MY EDIT' });
    await update<Branch>('branches', 'br-6-decree', { chosenOptionId: 'covert', notesMd: 'They bypassed the exchanger.' });
    await db.lessons.update('les-clocks', { done: true });
    const v3 = structuredClone(seedV2());
    v3.version = 5;
    for (const n of v3.tables.npcs!) n.role = `${n.role} (v3)`;
    for (const b of v3.tables.branches!) b.title = `${b.title} (v3)`;
    for (const l of v3.tables.lessons!) l.title = `${l.title} (v3)`;
    const r = await applySeed(v3);
    expect((await db.npcs.get('npc-elara'))!.role).toMatch(/\(v3\)$/);
    expect((await db.npcs.get('npc-tarin'))!).toMatchObject({ wants: 'MY EDIT' });
    expect((await db.npcs.get('npc-tarin'))!.role).not.toMatch(/v3/);
    expect(r.collisions.map((c) => c.id)).toEqual(['npc-tarin']);
    expect((await db.branches.get('br-6-decree'))!).toMatchObject({ chosenOptionId: 'covert', notesMd: 'They bypassed the exchanger.', title: 'Response to the Mercy Decree' });
    expect(r.frozen.some((f) => f.id === 'br-6-decree')).toBe(true);
    expect((await db.branches.get('br-1-rescue'))!.title).toMatch(/\(v3\)$/);
    expect((await db.lessons.get('les-clocks'))!).toMatchObject({ done: true });
    expect((await db.lessons.get('les-clocks'))!.title).toMatch(/\(v3\)$/);
  });
});

describe('backup and restore', () => {
  it('survives export → wipe → restore with counts, relationships and seed state intact', async () => {
    await applySeed(seedV2());
    await update<NPC>('npcs', 'npc-mara', { lastSeen: 'Ration plaza, session 1' });
    await addEvent('ses-1', 'EVENT', 'The party freed the lift.');
    await changeClock((await db.clocks.get('clk-unrest'))!, 1, 'Crush at the shelter');
    await revealClue((await db.clues.get('clu-conduit'))!, 'ses-1');
    await update<Branch>('branches', 'br-1-rescue', { chosenOptionId: 'lift' });
    const before = await counts();

    const file = parseBackup(JSON.stringify(await exportBackup()));
    expect(file.manifest.schemaVersion).toBe(2);
    expect(JSON.stringify(file)).not.toMatch(/recoveryHash|"pinHash"|solmourn\.lock/); // the passphrase is never in backups
    await wipeAll();
    expect(await db.npcs.count()).toBe(0);
    await applyImport(file, { mode: 'replace' });
    await applySeed(seedV2()); // what the app does after a restore: must be a no-op here

    expect(await counts()).toEqual(before);
    expect((await db.npcs.get('npc-mara'))!.lastSeen).toBe('Ration plaza, session 1');
    expect((await db.clocks.get('clk-unrest'))!.value).toBe(2);
    expect((await db.clues.get('clu-conduit'))!).toMatchObject({ status: 'FOUND', visibility: 'REVEALED' });
    expect((await db.branches.get('br-1-rescue'))!.chosenOptionId).toBe('lift');
    expect(await getSeedVersion()).toBe(4);
  });
  it('restoring an OLD eight-session backup then upgrades it without losing edits', async () => {
    await installV1();
    await update<NPC>('npcs', 'npc-seren', { wants: 'MY EDIT' });
    const old = parseBackup(JSON.stringify(await exportBackup()));
    await wipeAll();
    await applySeed(seedV2()); // a new phone, freshly seeded
    await applyImport(old, { mode: 'replace' });
    await applySeed(seedV2());
    expect(await db.sessions.count()).toBe(15);
    expect((await db.npcs.get('npc-seren'))!.wants).toBe('MY EDIT');
  });
  it('rejects files that are not Solmourn backups', () => {
    expect(() => parseBackup('not json')).toThrow();
    expect(() => parseBackup('{"hello":1}')).toThrow(/not a Solmourn/);
  });
  it('logs clock changes and reveals with before/after', async () => {
    await applySeed(seedV2());
    await changeClock((await db.clocks.get('clk-everflame'))!, 1);
    const log = await db.audit.toArray();
    expect(log.map((a) => a.eventType)).toEqual(expect.arrayContaining(['clock', 'seed-upgrade']));
    expect(JSON.parse(log.find((a) => a.eventType === 'clock')!.beforeJson!).value).toBe(1);
  });
});
