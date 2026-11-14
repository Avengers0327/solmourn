// Seed v4: the three owner decisions (public Sundering, Exchange 17, seven workers), the source-
// audited spell directory, stable Pattern ids, and upgrading a v3 save without losing anything.
import 'fake-indexeddb/auto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { freshData, seedV2 } from './fixtures/seedV2';
import { db } from '../src/data/db';
import { wipeAll } from '../src/data/backup';
import { changeClock, update } from '../src/data/repo';
import { migratePatternSelections } from '../src/data/patternMigration';
import { applySeed, getSeedReport } from '../src/data/seedEngine';
import { blankPc } from '../src/data/blank';
import { SPELLS, SPELL_BOOKS, UNMATCHED_MAPPING_NAMES, bookSummaries, coverageReport, normalizePatternId, patternById, playerVisible, spellTotals } from '../src/content/spells';
import { calcCast, castInputFor, syncResources } from '../src/domain/rules';
import { filterSpells } from '../src/domain/spellFilter';
import { buildPlayerRecap, safeProjection, scanSpoilers, type CampaignData } from '../src/domain/safe';
import { buildDmIndex, buildSafeIndex, search } from '../src/domain/search';
import type { Branch, Clock, Clue, Location, NPC, PC, Revelation, Scene, Session, TimelineEntry } from '../src/domain/types';

const T = freshData() as unknown as Record<string, Record<string, unknown>[]>;
const d = freshData() as unknown as CampaignData;
const sessions = T.sessions as unknown as Session[];
const clues = T.clues as unknown as Clue[];
const revs = T.revelations as unknown as Revelation[];
const npcs = T.npcs as unknown as NPC[];
const branches = T.branches as unknown as Branch[];
const scenes = T.scenes as unknown as Scene[];
const locs = T.locations as unknown as Location[];
const NY = /New York|Manhattan|Midtown|Mahwah|Ramapo|42 ST|Grand Central|Penn Station|Central Park|Hudson/i;

describe('Exchange 17: the opening location (LOCKED)', () => {
  const ex = locs.find((l) => l.id === 'loc-opening-station')!;
  it('is Frostward Thermal Exchange 17, an aging thermal distribution and maintenance facility', () => {
    expect(ex).toMatchObject({ name: 'Frostward Thermal Exchange 17', canonStatus: 'LOCKED', visibility: 'DM_ONLY', parentLocationId: 'loc-frostward' });
    expect(ex.bodyMd).toMatch(/aging thermal distribution and maintenance facility serving Frostward neighbourhoods/);
    expect(ex.playerMd).toMatch(/Exchange 17/);
  });
  it('is not merged with the retired Station F-17', () => {
    const f17 = locs.find((l) => l.id === 'loc-f17')!;
    expect(f17).toMatchObject({ canonStatus: 'RETIRED', visibility: 'DM_ONLY', playerMd: '' });
    expect(f17.parentLocationId).toBe('loc-frostward');
    expect(ex.bodyMd).toMatch(/not the retired Station F-17/);
    expect(ex.bodyMd).not.toMatch(/regulator hall.*Station F-17/s);
    // none of the legacy NPCs are attached to it
    for (const n of npcs.filter((x) => ['npc-tomas', 'npc-joren', 'npc-seren'].includes(x.id))) expect(n.locationId).toBeUndefined();
  });
  it('contains no hint of the New York identity, in the site, session 1, session 2 or their clues', () => {
    const text = JSON.stringify([ex, sessions.filter((s) => s.index <= 2).map((s) => s.prepMd), scenes.filter((s) => ['ses-1', 'ses-2'].includes(s.sessionId)), clues.filter((c) => c.sessionIndex <= 2)]);
    expect(text).not.toMatch(NY);
  });
  it('has a text site layout (no drawn map exists)', () => {
    expect(ex.bodyMd).toMatch(/Site layout/);
    expect(ex.bodyMd).toMatch(/COLLAPSED lower service gallery/);
    expect(ex.bodyMd).toMatch(/there is no drawn map/);
  });
  it('session 1 and session 2 use it and reference it in prep, scenes and the read-aloud', () => {
    expect(sessions[0].prepMd).toMatch(/Frostward Thermal Exchange 17/);
    expect(sessions[0].questionMd).toMatch(/Frostward Thermal Exchange 17/);
    expect(sessions[1].prepMd).toMatch(/Exchange 17: regulator hall/);
    expect(scenes.some((s) => s.sessionId === 'ses-1' && /Exchange 17/.test(s.title + s.descriptionMd))).toBe(true);
  });
});

describe('The seven missing workers (LOCKED opening facts)', () => {
  const by = (id: string) => npcs.find((n) => n.id === id)!;
  it('exactly seven: four trapped, two detained, one deeper inside (Ilan Rook)', () => {
    expect(by('npc-workers-trapped').name).toBe('The four trapped workers');
    expect(by('npc-workers-trapped').role).toMatch(/collapsed lower service gallery/);
    expect(by('npc-workers-detained').name).toBe('The two detained workers');
    expect(by('npc-workers-detained').role).toMatch(/Imperial security/);
    expect(by('npc-workers-detained').privateInfoMd).toMatch(/suppressed maintenance reports/);
    expect(by('npc-ilan-rook')).toMatchObject({ name: 'Ilan Rook', status: 'MISSING', canonStatus: 'LOCKED' });
    expect(4 + 2 + 1).toBe(7);
    const ex = locs.find((l) => l.id === 'loc-opening-station')!;
    expect(ex.bodyMd).toMatch(/exactly seven maintenance workers/);
    expect(ex.bodyMd).toMatch(/\*\*Four\*\* are trapped/);
    expect(ex.bodyMd).toMatch(/\*\*Two\*\* are detained/);
  });
  it('only Ilan Rook is named; everything else stays OPEN', () => {
    expect(by('npc-ilan-rook').privateInfoMd).toMatch(/personality, motives, history and species are OPEN/);
    expect(by('npc-ilan-rook').privateInfoMd).toMatch(/not predetermined/);
    expect(by('npc-workers-trapped').privateInfoMd).toMatch(/Names, species and condition are OPEN/);
    expect(by('npc-workers-detained').privateInfoMd).toMatch(/OPEN and depend on play/);
  });
  it('the old "43 missing residents" scenario is gone from every current record', () => {
    expect(JSON.stringify([T.sessions, T.scenes, T.clues, T.revelations, T.branches, T.npcs, T.clocks, T.lessons])).not.toMatch(/\b43\b|forty-three/i);
  });
  it('the party has three or more routes to each group, and none is forced', () => {
    for (const id of ['rev-trapped', 'rev-detained', 'rev-ilan']) {
      const mine = clues.filter((c) => c.revelationIds.includes(id));
      expect(mine.length, id).toBeGreaterThanOrEqual(3);
      expect(mine.filter((c) => c.revelationIds.length === 1).length, `${id} independent of the shared roster`).toBeGreaterThanOrEqual(2);
      expect(mine.every((c) => c.discoveryRoutes.length >= 2), id).toBe(true);
    }
    expect(clues.filter((c) => c.revelationIds.some((r) => ['rev-trapped', 'rev-detained', 'rev-ilan'].includes(r))).filter((c) => c.required)).toEqual([]);
    for (const id of ['rev-trapped', 'rev-detained', 'rev-ilan']) expect(revs.find((r) => r.id === id)!.backupMd.length, id).toBeGreaterThan(20);
  });
  it('the three groups can be pursued in any order: no clue of one needs another', () => {
    const group = (g: string) => new Set(clues.filter((c) => c.revelationIds.length === 1 && c.revelationIds[0] === g).map((c) => c.id));
    const [a, b, c] = ['rev-trapped', 'rev-detained', 'rev-ilan'].map(group);
    for (const x of a) expect(b.has(x) || c.has(x)).toBe(false);
    const worker = ['rev-trapped', 'rev-detained', 'rev-ilan'];
    expect(clues.filter((x) => x.revelationIds.length > 1 && x.revelationIds.some((r) => worker.includes(r))).map((x) => x.id).sort()).toEqual(['clu-roster', 'clu-suppressed-report']);
  });
  it('player-safe wording exists for every worker clue and names nothing hidden', () => {
    const wc = clues.filter((c) => c.revelationIds.some((r) => ['rev-trapped', 'rev-detained', 'rev-ilan'].includes(r)));
    expect(wc.length).toBe(9);
    for (const c of wc) {
      expect(c.playerTextMd.length, c.id).toBeGreaterThan(20);
      expect(c.playerTextMd, c.id).not.toMatch(NY);
      expect(c.visibility).toBe('DM_ONLY');
      expect(c.status).toBe('NOT_SEEN');
    }
  });
  it('the campaign tracker counts to seven and moves only when the DM moves it', () => {
    const k = (T.clocks as unknown as Clock[]).find((c) => c.id === 'clk-workers')!;
    expect(k).toMatchObject({ name: 'Missing workers accounted for', value: 0, max: 7, group: 'state', reasonHistory: [] });
    expect(k.meaningMd).toMatch(/not required to account for all seven/);
  });
  it('branch outcomes: free choice, recovery paths, no preset fate', () => {
    const b = (id: string) => branches.find((x) => x.id === id)!;
    expect(b('br-1-workers').options.map((o) => o.id)).toEqual(['trapped', 'detained', 'ilan', 'district', 'split']);
    expect(b('br-1-workers').options.find((o) => o.id === 'district')!.label).toMatch(/district first/);
    expect(b('br-2-ilan').options).toHaveLength(4);
    expect(b('br-3-detained').options.map((o) => o.id)).toEqual(['negotiate', 'breakout', 'expose', 'leave']);
    expect(b('br-3-ilan').preconditionMd).toMatch(/nothing below is preset/);
    expect(b('br-3-ilan').options.map((o) => o.id)).toEqual(['alive-out', 'alive-deeper', 'dead', 'unknown', 'other']);
    for (const id of ['br-1-workers', 'br-2-ilan', 'br-3-detained', 'br-3-ilan']) {
      expect(b(id).chosenOptionId, id).toBeUndefined();
      expect(b(id).recoveryMd.length, id).toBeGreaterThan(20);
      expect(b(id).canonStatus, id).toBe('LOCKED');
    }
    expect(b('br-1-workers').recoveryMd).toMatch(/no worker is lost by default/);
    expect(new Set(branches.map((x) => x.sessionIndex)).size).toBe(15);
  });
  it('hazard card for the collapsed gallery exists, with a countdown rather than a fight', () => {
    const cards = T.statCards as unknown as { id: string; kind: string; attacksMd: string }[];
    const g = cards.find((c) => c.id === 'sc-collapsed-gallery')!;
    expect(g.kind).toBe('HAZARD');
    expect(g.attacksMd).toMatch(/4 successes/);
  });
});

describe('"The Sundering" is public; the secrets behind it are not', () => {
  it('the name, glossary, timeline and welcome text are player-visible', () => {
    const cards = safeProjection(d);
    const text = JSON.stringify(cards);
    expect(cards.find((c) => c.id === 'lore-g-sundering')!.text).toMatch(/Sundering/);
    expect(cards.find((c) => c.id === 'lore-g-as')!.text).toMatch(/After the Sundering/);
    expect(cards.find((c) => c.id === 'tl-sundering')).toMatchObject({ kind: 'timeline', subtitle: '~2230 CE · 0 AS' });
    expect(cards.find((c) => c.id === 'tl-present')!.text).toMatch(/700 AS/);
    expect(text).toMatch(/since the Sundering/);
    expect(search(buildSafeIndex(d), 'Sundering').length).toBeGreaterThan(0);
  });
  it('but nothing beyond the name leaks: no Dissonance, sun truth, Concordance or Embers', () => {
    const player = JSON.stringify([safeProjection(d), buildSafeIndex(d)]);
    for (const w of ['Dissonance', 'Concordance', 'Ember', 'New York', 'Unbound', 'natural sun', 'nine artificial', 'obstruct', 'False Dawn']) expect(player, w).not.toContain(w);
    expect(player).not.toMatch(/\bsun (still|remains|exists)/i);
    expect(scanSpoilers('The Sundering froze the world seven centuries ago.', d.revelations)).toEqual([]);
    expect(scanSpoilers('The Sundering was caused by Dissonance.', d.revelations).map((h) => h.term)).toEqual(['Dissonance']);
  });
  it('the timeline entries for the catastrophe keep their DM-only truth in a separate field', () => {
    const t = (T.timeline as unknown as TimelineEntry[]).find((x) => x.id === 'tl-sundering')!;
    expect(t.bodyMd).toMatch(/Dissonance/);
    expect(t.playerMd).not.toMatch(/Dissonance|sun/i);
    const hidden = (T.timeline as unknown as TimelineEntry[]).filter((x) => !['tl-sundering', 'tl-present'].includes(x.id));
    expect(hidden.every((x) => x.visibility === 'DM_ONLY' && x.playerMd === '')).toBe(true);
    expect(buildPlayerRecap(d, 'ses-1')).toBe('# Session 1\n');
  });
  it('the decision log records it as LOCKED', () => {
    const dec = (T.canonDecisions as unknown as { id: string; status: string; selectedOption?: string }[]).find((x) => x.id === 'dec-sundering-public')!;
    expect(dec).toMatchObject({ status: 'LOCKED' });
    expect(dec.selectedOption).toMatch(/common public name/);
  });
});

describe('spell inventory: sources, verification and deduplication', () => {
  const totals = spellTotals();
  it('has no duplicate spells and every mapping name matched a real spell', () => {
    expect(new Set(SPELLS.map((s) => s.id)).size).toBe(SPELLS.length);
    expect(new Set(SPELLS.map((s) => (s.publishedName ?? s.name).toLowerCase())).size).toBe(SPELLS.length);
    expect(UNMATCHED_MAPPING_NAMES).toEqual([]);
  });
  it('printed counts per book match the index (not an official check)', () => {
    const n = Object.fromEntries(bookSummaries().map((b) => [b.code, b.total]));
    expect(n).toMatchObject({ PHB: 361, XGE: 95, TCE: 21, EGW: 15, AI: 7, FTD: 7, SCC: 5, LLK: 3, BMT: 3, IDRF: 2, AAG: 2, PAM: 2, GGR: 1 });
    expect(totals).toMatchObject({ official: 524, srd: 319, unverified: 205, original: 12, unofficial: 42 });
  });
  it('verification status is honest: only SRD and original entries are called verified', () => {
    for (const s of SPELLS) {
      expect(['SRD_VERIFIED', 'CROSS_CHECKED', 'ORIGINAL', 'UNOFFICIAL']).toContain(s.verification);
      if (s.verification === 'SRD_VERIFIED') expect(!!s.rulesMd && s.licensedTextAvailable && s.origin === 'SRD', s.id).toBe(true);
      if (s.verification === 'CROSS_CHECKED') expect(!s.rulesMd && !s.licensedTextAvailable && /UNVERIFIED/.test(s.source), s.id).toBe(true);
    }
    expect(SPELLS.filter((s) => s.verification === 'CROSS_CHECKED' && s.sources?.length === 0)).toEqual([]);
  });
  it('no non-SRD, non-original rules text is stored', () => {
    for (const s of SPELLS.filter((x) => x.origin !== 'SRD' && x.origin !== 'ORIGINAL')) {
      expect(s.rulesMd, s.id).toBeUndefined();
      expect(s.upcastMd, s.id).toBeUndefined();
    }
    // metadata fields are short; no description-length strings sneak in
    for (const s of SPELLS.filter((x) => x.origin !== 'SRD' && x.origin !== 'ORIGINAL')) for (const f of [s.action, s.range, s.duration ?? '', s.components ?? '']) expect(f.length, s.id).toBeLessThan(120);
  });
  it('every row records level, school, casting time, range, duration, components and at least one book', () => {
    for (const s of SPELLS.filter((x) => x.origin !== 'ORIGINAL')) {
      expect(s.level >= 0 && s.level <= 9, s.id).toBe(true);
      expect(s.school, s.id).toBeTruthy();
      expect(s.action, s.id).toBeTruthy();
      expect(s.range, s.id).toBeTruthy();
      expect(s.duration, s.id).toBeTruthy();
      expect(typeof s.concentration, s.id).toBe('boolean');
      expect(s.sources!.length, s.id).toBeGreaterThan(0);
      expect(s.sources!.every((c) => SPELL_BOOKS.some((b) => b.code === c)), s.id).toBe(true);
    }
  });
  it('spells printed in more than one book are one row', () => {
    const multi = SPELLS.filter((s) => (s.sources?.length ?? 0) > 1);
    expect(multi.map((s) => s.name)).toEqual(expect.arrayContaining(['Magic Stone', 'Earth Tremor', 'Green-Flame Blade']));
    expect(SPELLS.filter((s) => s.name === 'Magic Stone')).toHaveLength(1);
    expect(patternById('spell:magic-stone')!.sources).toEqual(['XGE', 'EEPC']);
  });
  it('records where the sources disagree instead of silently picking one', () => {
    const conflicts = SPELLS.filter((s) => s.discrepancies?.length);
    expect(conflicts.map((s) => s.name).sort()).toEqual(['Mass Cure Wounds', 'Mass Heal', 'Revivify']);
    expect(patternById('spell:revivify')!.discrepancies![0]).toMatch(/SRD Conjuration, index Necromancy/);
  });
  it('Unearthed Arcana is listed, excluded, and never shown to players', () => {
    const ua = SPELLS.filter((s) => s.verification === 'UNOFFICIAL');
    expect(ua.length).toBe(42);
    expect(ua.every((s) => s.status === 'EXCLUDED' && s.origin === 'UA' && /playtest/i.test(s.excludedReason ?? ''))).toBe(true);
    expect(SPELLS.some((s) => s.verification === 'UNOFFICIAL' && s.id === patternById('spell:nathair-s-mischief')?.id && s.origin === 'UA')).toBe(false); // the published version wins
    expect(filterSpells(SPELLS, { playerView: true }).some((s) => s.verification === 'UNOFFICIAL')).toBe(false);
  });
  it('coverage by book adds up and every book that prints a spell is listed', () => {
    const cov = coverageReport();
    for (const b of bookSummaries()) expect(cov.filter((c) => c.code === b.code).reduce((a, c) => a + c.total, 0), b.code).toBe(b.total);
    expect(bookSummaries().find((b) => b.code === 'PHB')).toMatchObject({ total: 361, verified: 319, unverified: 42 });
  });
});

describe('discipline mapping and exclusions', () => {
  it('every mapped spell has a discipline and an explanation; ambiguous ones say why', () => {
    for (const s of SPELLS.filter((x) => x.origin !== 'ORIGINAL')) {
      expect(['RADIANCE', 'KINESIS', 'VITALITY', 'VEIL', 'FORM', 'ECHO']).toContain(s.discipline);
      expect(s.mappingNote!.length, s.id).toBeGreaterThan(20);
    }
    const amb = SPELLS.filter((s) => s.ambiguous);
    expect(amb.length).toBeGreaterThan(15);
    expect(amb.every((s) => s.mappingNote!.length > 40)).toBe(true);
  });
  it('every excluded spell has a reason', () => {
    const ex = SPELLS.filter((s) => s.status === 'EXCLUDED');
    expect(ex.every((s) => !!s.excludedReason && s.excludedReason.length > 10)).toBe(true);
    for (const n of ['Summon Beast', 'Gate Seal', 'Ceremony', 'Soul Cage', 'Danse Macabre', 'Hex']) expect(SPELLS.find((s) => s.name === n)?.status, n).toBe('EXCLUDED');
    expect(SPELLS.filter((s) => s.status === 'EXCLUDED' && s.origin !== 'UA').length).toBe(92);
  });
  it('one discipline per spell: a Resonant cannot take another discipline\'s Pattern', () => {
    const r = { ...blankPc(), id: 'r', classId: 'resonant', level: 17, attunement: 'KINESIS', patternIds: [], preparedIds: [], resources: [] } as unknown as PC;
    const legal = filterSpells(SPELLS, { character: r, mine: 'LEGAL' });
    expect(legal.length).toBeGreaterThan(50);
    expect(legal.every((s) => s.discipline === 'KINESIS' && s.status === 'MAPPED')).toBe(true);
  });
});

describe('searching and filtering', () => {
  const pc = (p: Partial<PC>) => ({ ...blankPc(), id: 'pc-r', classId: 'resonant', level: 3, attunement: 'RADIANCE', patternIds: [], preparedIds: [], resources: [], ...p }) as unknown as PC;
  it('by spell name and by published name', () => {
    expect(filterSpells(SPELLS, { q: 'fire bolt' }).map((s) => s.name)).toEqual(['Fire Bolt']);
    expect(filterSpells(SPELLS, { q: 'searing flare' }).map((s) => s.publishedName)).toEqual(['Sacred Flame']);
    expect(filterSpells(SPELLS, { q: 'sacred flame' }).map((s) => s.name)).toEqual(['Searing Flare']);
    expect(filterSpells(SPELLS, { q: "melf's acid" }).map((s) => s.name)).toEqual(["Melf's Acid Arrow"]);
  });
  it('by discipline, level, school, sourcebook, verification and availability', () => {
    expect(filterSpells(SPELLS, { discipline: 'ECHO' }).every((s) => s.discipline === 'ECHO')).toBe(true);
    expect(filterSpells(SPELLS, { level: '9' }).every((s) => s.level === 9)).toBe(true);
    expect(filterSpells(SPELLS, { school: 'Necromancy' }).every((s) => s.school === 'Necromancy')).toBe(true);
    expect(filterSpells(SPELLS, { book: 'EGW' })).toHaveLength(15);
    expect(filterSpells(SPELLS, { book: 'XGE' })).toHaveLength(95);
    expect(filterSpells(SPELLS, { verification: 'SRD_VERIFIED' })).toHaveLength(319);
    expect(filterSpells(SPELLS, { verification: 'CROSS_CHECKED' })).toHaveLength(205);
    expect(filterSpells(SPELLS, { availability: 'EXCLUDED' }).every((s) => s.status === 'EXCLUDED')).toBe(true);
    expect(filterSpells(SPELLS, { discipline: 'KINESIS', level: '2', book: 'PHB', availability: 'MAPPED' }).map((s) => s.name)).toContain('Misty Step');
  });
  it('for a selected character: legal, known, prepared, and favorites', () => {
    const fb = patternById('spell:fire-bolt')!, br = patternById('spell:burning-hands')!;
    const c = pc({ patternIds: [fb.id, br.id], preparedIds: [br.id] });
    expect(filterSpells(SPELLS, { character: c, mine: 'KNOWN' }).map((s) => s.name).sort()).toEqual(['Burning Hands', 'Fire Bolt']);
    expect(filterSpells(SPELLS, { character: c, mine: 'PREPARED' }).map((s) => s.name)).toEqual(['Burning Hands']);
    const legal = filterSpells(SPELLS, { character: c, mine: 'LEGAL' });
    expect(legal.every((s) => s.discipline === 'RADIANCE' && s.level <= 2)).toBe(true);
    expect(legal.some((s) => s.name === 'Fireball')).toBe(false); // level 3: not accessible at caster level 3
    expect(filterSpells(SPELLS, { favoritesOnly: true, favorites: [fb.id] }).map((s) => s.name)).toEqual(['Fire Bolt']);
    expect(filterSpells(SPELLS, { favoritesOnly: true, favorites: [] })).toEqual([]);
  });
});

describe('RP costs and casting validation use the spell\'s level', () => {
  const r = (patch: Partial<PC> = {}) => { const p = { ...blankPc(), id: 'r', classId: 'resonant', level: 3, attunement: 'RADIANCE', patternIds: [], preparedIds: [], resources: [], ...patch } as unknown as PC; return { ...p, resources: syncResources(p) }; };
  it('0 / 2 / 3 / 5 / 6 / 7 / 9 / 10 / 11 / 13 for levels 0-9, for every directory entry', () => {
    for (const s of SPELLS) expect(s.rpCost, s.id).toBe([0, 2, 3, 5, 6, 7, 9, 10, 11, 13][s.level]);
  });
  it('level 3 Resonant: 14 RP, a level-2 spell costs 3, +2 amplification adds 4 RP, 2d6, DC 15', () => {
    const p = r();
    const sr = patternById('spell:scorching-ray')!;
    expect(calcCast(castInputFor(p, sr.level))).toMatchObject({ ok: true, totalCost: 3 });
    expect(calcCast(castInputFor(p, sr.level, { ampTier: 2 }))).toMatchObject({ totalCost: 7, strain: '2d6', conDc: 15 });
    expect(calcCast(castInputFor(p, patternById('spell:fireball')!.level)).ok).toBe(false);
    expect(calcCast(castInputFor(p, patternById('spell:fire-bolt')!.level, { ampTier: 1 }))).toMatchObject({ ok: true, totalCost: 2 });
  });
  it('concentration is carried through from the spell data', () => {
    expect(patternById('spell:heat-metal')!.concentration).toBe(true);
    expect(patternById('spell:fireball')!.concentration).toBe(false);
    expect(patternById('spell:witch-bolt')!.concentration).toBe(true);
  });
});

describe('DM-only Patterns and spoiler isolation', () => {
  it('a DM-only Pattern never appears in player browsing, filtering or search, but does for the DM', () => {
    const secret = { ...SPELLS.find((s) => s.name === 'Fire Bolt')!, id: 'spell:secret-pattern', name: 'Zzyzx Pattern', publishedName: undefined, visibility: 'DM_ONLY' as const };
    SPELLS.push(secret);
    try {
      expect(playerVisible(SPELLS).some((s) => s.id === secret.id)).toBe(false);
      expect(filterSpells(SPELLS, { q: 'zzyzx', playerView: true })).toEqual([]);
      expect(filterSpells(SPELLS, { q: 'zzyzx' })).toHaveLength(1);
      expect(search(buildSafeIndex(d), 'Zzyzx')).toEqual([]);
      expect(search(buildDmIndex(d as never), 'Zzyzx')).toHaveLength(1);
    } finally {
      SPELLS.splice(SPELLS.indexOf(secret), 1);
    }
  });
  it('no directory entry or mapping note mentions campaign secrets', () => {
    const text = JSON.stringify(SPELLS.map((s) => [s.name, s.mappingNote, s.excludedReason, s.source, s.discrepancies]));
    for (const w of ['New York', 'Manhattan', 'Concordance', 'Unbound', 'Ember', 'Cinder', 'Old Relay', 'Vesperdeep']) expect(text, w).not.toContain(w);
  });
});

describe('the directory works offline', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
  it('is bundled static data: the app source makes no network requests at all', () => {
    const files = walk('src').filter((f) => /\.(ts|tsx)$/.test(f));
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket\(|navigator\.sendBeacon|EventSource\(/);
    expect(readdirSync('src/content')).toEqual(expect.arrayContaining(['spells.index.json', 'spells.srd.json']));
  });
});

describe('Pattern selections survive the id change', () => {
  beforeEach(async () => { await wipeAll(); });
  const put = (id: string, patternIds: string[], preparedIds: string[]) =>
    db.pcs.put({ ...blankPc(), id, campaignId: 'solmourn', createdAt: '', updatedAt: '', revision: 1, name: id, classId: 'resonant', attunement: 'RADIANCE', patternIds, preparedIds } as unknown as PC);
  it('old discipline-prefixed ids map to the new stable ids', () => {
    expect(normalizePatternId('radiance:fire-bolt')).toBe('spell:fire-bolt');
    expect(normalizePatternId('kinesis:shield')).toBe('spell:shield');
    expect(normalizePatternId('form:mold-earth')).toBe('spell:mold-earth');
    expect(normalizePatternId('radiance:arc-tap')).toBe('spell:arc-tap'); // original Patterns too
    expect(normalizePatternId('radiance:acid-arrow')).toBe('spell:acid-arrow'); // SRD generic name kept as the stable key
    expect(normalizePatternId('spell:fire-bolt')).toBe('spell:fire-bolt');
    expect(normalizePatternId('radiance:homebrew-thing')).toBe('radiance:homebrew-thing'); // unknown ids are never rewritten
    expect(patternById('radiance:sacred-flame')!.name).toBe('Searing Flare');
  });
  it('migrates a character without deleting anything, logs it, and is idempotent', async () => {
    await put('rin', ['radiance:fire-bolt', 'radiance:burning-hands', 'radiance:homebrew-thing'], ['radiance:burning-hands']);
    await put('already', ['spell:fire-bolt'], []);
    const r1 = await migratePatternSelections();
    expect(r1).toMatchObject({ charactersChanged: 1, idsRenamed: 3 });
    expect(r1.unknown).toEqual([{ pc: 'rin', id: 'radiance:homebrew-thing' }, { pc: 'rin', id: 'radiance:homebrew-thing' }].slice(0, 1));
    const rin = (await db.pcs.get('rin'))!;
    expect(rin.patternIds).toEqual(['spell:fire-bolt', 'spell:burning-hands', 'radiance:homebrew-thing']);
    expect(rin.preparedIds).toEqual(['spell:burning-hands']);
    expect((await db.pcs.get('already'))!.revision).toBe(1);
    expect((await db.audit.toArray()).filter((a) => a.eventType === 'pattern-migration')).toHaveLength(1);
    const snap = JSON.stringify(await db.pcs.toArray());
    const r2 = await migratePatternSelections();
    expect(r2).toMatchObject({ charactersChanged: 0, idsRenamed: 0 });
    expect(JSON.stringify(await db.pcs.toArray())).toBe(snap);
  });
});

describe('upgrading a seed v3 save to v4', () => {
  beforeEach(async () => { await wipeAll(); });
  /** What the v3 seed had for the three superseded records. */
  const asV3 = () => {
    const b = structuredClone(seedV2());
    b.version = 3;
    const tmpl = b.tables.canonDecisions![0];
    const old = (id: string, topic: string) => ({ ...tmpl, id, topic, status: 'OPEN', selectedOption: undefined, options: [], rejected: [], rationaleMd: 'OPEN in v3' });
    b.tables.canonDecisions = [...b.tables.canonDecisions!.filter((x) => !['dec-sundering-public', 'dec-exchange-17', 'dec-seven-workers'].includes(x.id)), old('dec-missing-workers', 'The missing workers: number, fate and location'), old('dec-opening-station', 'Name of the opening exchanger station'), old('dec-sundering-term', 'Public name for the catastrophe')];
    // Records that only exist from v4 on.
    const NEW: Record<string, string[]> = {
      npcs: ['npc-ilan-rook', 'npc-workers-trapped', 'npc-workers-detained'], clocks: ['clk-workers'], branches: ['br-1-workers', 'br-2-ilan', 'br-3-detained', 'br-3-ilan'],
      revelations: ['rev-trapped', 'rev-detained', 'rev-ilan'], lore: ['lore-g-sundering', 'lore-g-as', 'lore-g-exchange'], statCards: ['sc-collapsed-gallery'],
      clues: ['clu-roster', 'clu-tapping', 'clu-gallery-plan', 'clu-detention-record', 'clu-witness-vans', 'clu-suppressed-report', 'clu-ilan-locker', 'clu-ilan-trail', 'clu-ilan-badge'],
    };
    for (const [t, ids] of Object.entries(NEW)) (b.tables as Record<string, { id: string }[]>)[t] = (b.tables as Record<string, { id: string }[]>)[t].filter((r) => !ids.includes(r.id));
    // v3 prep for session 1 differed; a session already played must keep what it was run with.
    (b.tables.sessions!.find((x) => x.id === 'ses-1') as { prepMd: string }).prepMd = 'V3 PREP';
    (b.tables.scenes!.find((x) => x.id === 'scn-1-3') as { title: string }).title = "Mara's count";
    const st = b.tables.locations!.find((l) => l.id === 'loc-opening-station')!;
    st.name = 'Frostward exchanger station (name OPEN)';
    st.canonStatus = 'WORKING';
    return b;
  };
  it('resolves the three decisions, keeps play state and played sessions, and duplicates nothing', async () => {
    await applySeed(asV3());
    await changeClock((await db.clocks.get('clk-ors'))!, 1, 'Loud break-in');
    await db.sessions.update('ses-1', { status: 'COMPLETE', dmNotesMd: 'MY NOTES' });
    await db.pcs.put({ ...blankPc(), id: 'pc-rin', campaignId: 'solmourn', createdAt: '', updatedAt: '', revision: 1, name: 'Rin', patternIds: ['radiance:fire-bolt'], preparedIds: [] } as unknown as PC);
    await update<NPC>('npcs', 'npc-mara', { status: 'ALLY', lastSeen: 'Ration plaza' });
    const before = (await db.lore.toArray()).length;

    const r = await applySeed(seedV2());
    expect(r.fromVersion).toBe(3);
    expect(r.version).toBe(4);
    // resolved decisions
    for (const id of ['dec-missing-workers', 'dec-opening-station', 'dec-sundering-term']) expect((await db.canonDecisions.get(id))!.deletedAt, id).toBeTruthy();
    for (const id of ['dec-sundering-public', 'dec-exchange-17', 'dec-seven-workers']) expect(await db.canonDecisions.get(id), id).toMatchObject({ status: 'LOCKED' });
    expect((await db.locations.get('loc-opening-station'))!).toMatchObject({ name: 'Frostward Thermal Exchange 17', canonStatus: 'LOCKED' });
    // new records arrive once
    for (const id of ['npc-ilan-rook', 'npc-workers-trapped', 'npc-workers-detained', 'clk-workers', 'br-1-workers', 'br-3-ilan', 'rev-trapped', 'lore-g-sundering', 'sc-collapsed-gallery']) {
      const found = (await Promise.all([db.npcs.get(id), db.clocks.get(id), db.branches.get(id), db.revelations.get(id), db.lore.get(id), db.statCards.get(id)])).filter(Boolean);
      expect(found, id).toHaveLength(1);
    }
    expect((await db.lore.toArray()).length).toBeGreaterThan(before);
    // play state preserved
    expect((await db.clocks.get('clk-ors'))!).toMatchObject({ value: 1, reasonHistory: [{ reason: 'Loud break-in' }] });
    expect((await db.sessions.get('ses-1'))!).toMatchObject({ status: 'COMPLETE', dmNotesMd: 'MY NOTES' });
    expect((await db.npcs.get('npc-mara'))!).toMatchObject({ status: 'ALLY', lastSeen: 'Ration plaza' });
    expect((await db.pcs.get('pc-rin'))!.name).toBe('Rin');
    // a played session 1 keeps the scenes it was run with
    expect(r.frozen.some((f) => f.table === 'sessions' && f.id === 'ses-1')).toBe(true);
    expect((await db.sessions.get('ses-1'))!.prepMd).toBe('V3 PREP');
    expect((await db.scenes.get('scn-1-3'))!.title).toBe("Mara's count");
    expect((await db.sessions.get('ses-2'))!.prepMd).toMatch(/Exchange 17/); // unplayed sessions move to the new prep
    // running it again changes nothing
    const snap = JSON.stringify([await db.lore.toArray(), await db.clues.toArray(), await db.branches.toArray()]);
    await applySeed(seedV2());
    expect(JSON.stringify([await db.lore.toArray(), await db.clues.toArray(), await db.branches.toArray()])).toBe(snap);
    expect((await getSeedReport())!.version).toBe(4);
  });
  it('an interrupted v3 → v4 upgrade rolls back completely', async () => {
    await applySeed(asV3());
    const before = JSON.stringify([await db.canonDecisions.toArray(), await db.locations.toArray(), await db.npcs.toArray()]);
    await expect(applySeed(seedV2(), 12)).rejects.toThrow(/interruption/);
    expect(JSON.stringify([await db.canonDecisions.toArray(), await db.locations.toArray(), await db.npcs.toArray()])).toBe(before);
    expect((await getSeedReport())!.version).toBe(3);
    await applySeed(seedV2());
    expect((await getSeedReport())!.version).toBe(4);
  });
});
