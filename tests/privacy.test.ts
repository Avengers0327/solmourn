// Spoiler-leak regression suite: nothing DM-only may reach a player-facing surface
// (Presenter projection, safe search index, exports), before reveal, after a partial reveal,
// and after a reveal is revoked.
import { describe, expect, it } from 'vitest';
import { freshData, readPlayerGuide } from './fixtures/seedV2';
import { buildCharacterGuideMd } from '../src/content/charGuide';
import { buildCharacterSheet, buildKnownNpcs, buildKnownPlaces, buildPlayerRecap, safeProjection, scanSpoilers, type CampaignData } from '../src/domain/safe';
import { buildDmIndex, buildSafeIndex, search } from '../src/domain/search';
import { blankPc } from '../src/data/blank';
import type { Clue, NPC, PC, Revelation, SessionEvent } from '../src/domain/types';

const SPOILERS = [
  'New York', 'Manhattan', 'Midtown', 'Mahwah', 'Ramapo', 'Vesperdeep', 'Kharos', 'Aureth', 'Namaris', 'Sevrin', 'Orrakai', 'Caldris', 'Azmara',
  'Ember', 'Concordance', 'Unbound', 'Dissonance', 'False Dawn', 'Old Relay', 'Cinder', 'Mercy Decree', 'Reykjav', 'Lagos', 'Ilan', 'Rook',
  'calculated atrocities', 'Tomas', 'F-17',
];
const fresh = () => freshData() as unknown as CampaignData & { lessons: unknown[]; branches: unknown[]; statCards: unknown[]; scenes: never[]; timeline: never[] };
const expectClean = (text: string, allow: string[] = []) => { for (const s of SPOILERS) if (!allow.includes(s)) expect(text, `leaked "${s}"`).not.toContain(s); };
const everythingPlayerFacing = (d: CampaignData) =>
  [...d.sessions.map((s) => buildPlayerRecap(d, s.id)), buildKnownNpcs(d), buildKnownPlaces(d), JSON.stringify(safeProjection(d)), JSON.stringify(buildSafeIndex(d))].join('\n');

describe('fresh player state (before session 1)', () => {
  const d = fresh();
  it('the DM index does contain the secrets (sanity check)', () => {
    const all = JSON.stringify(buildDmIndex(d as never));
    for (const s of SPOILERS) expect(all, s).toContain(s);
  });
  it('no export, projection or safe search index contains any spoiler', () => expectClean(everythingPlayerFacing(d)));
  it('the session 1 recap hides even the working session title', () => {
    expect(buildPlayerRecap(d, 'ses-1')).toBe('# Session 1\n');
    expect(buildPlayerRecap(d, 'ses-10')).toBe('# Session 10\n');
  });
  it('Presenter search finds nothing for hidden entities, aliases, linked titles or DM coaching', () => {
    const idx = buildSafeIndex(d);
    for (const q of ['York', 'Manhattan', 'Vesperdeep', 'Aureth', 'Azmara', 'Tomas', 'Joren', 'Mara', 'Concordance', 'Unbound', 'Ramapo', 'Cinders', 'Relay', 'Dissonance', 'Ember', 'Academy', 'automaton', 'Aurelia', 'Thane']) {
      expect(search(idx, q), q).toEqual([]);
    }
    for (const q of ['Old New York', 'Station F-17 regulator', 'nine Embers map', 'Mercy Decree branch', 'Divergence origin bioengineered']) expectClean(JSON.stringify(search(idx, q)));
    expect(search(idx, 'Frostward').length).toBeGreaterThan(0);
    expect(search(buildDmIndex(d as never), 'Where is Tomas?')[0].title).toMatch(/Tomas/);
  });
  it('public figures and public symbols ARE visible, without their secrets', () => {
    const cards = safeProjection(d);
    const empress = cards.find((c) => c.id === 'npc-seraphine')!;
    expect(empress.text).toMatch(/Empress of the Solar Imperium/);
    expect(JSON.stringify(empress)).not.toMatch(/atrocit|Strategist|appropriate/);
    const vigil = cards.find((c) => c.id === 'lore-p-vigil')!;
    expect(vigil.text).toMatch(/golden disk with nine rays/); // foreshadowing is shown...
    expect(vigil.text).not.toMatch(/Ember|cities|originally/i); // ...and never explained
  });
  it('the secret aliases of the city are never projected', () => {
    const solmourn = safeProjection(d).find((c) => c.id === 'loc-solmourn')!;
    expect(solmourn).toBeTruthy();
    expectClean(JSON.stringify(solmourn));
  });
  it('only player-safe documents are projected, and they are clean', () => {
    const docs = safeProjection(d).filter((c) => c.kind === 'doc');
    expect(docs.map((c) => c.title).sort()).toEqual(['Character Creation Guide', 'Player Guide (playtest rules v1.0)', 'Player Species & Character Creation (Divergence edition)']);
    for (const doc of docs) expectClean(doc.text);
  });
  it('the Character Creation Guide keeps prophecy and hidden geography out', () => {
    const md = buildCharacterGuideMd();
    expectClean(md);
    expect(scanSpoilers(md, d.revelations)).toEqual([]);
    expect(md).toMatch(/Proficiency bonus is \*\*\+2\*\* at level 3/);
    for (const c of ['Warden', 'Shade', 'Machinist', 'Resonant', 'Votary', 'Strider']) expect(md).toContain(`### ${c}`);
    expect(scanSpoilers(readPlayerGuide(), d.revelations)).toEqual([]);
  });
  it('DM Academy lessons, branches and stat cards are never part of the player projection', () => {
    const safe = JSON.stringify(safeProjection(d)) + JSON.stringify(buildSafeIndex(d));
    expect(safe).not.toMatch(/les-|br-\d|sc-/);
  });
});

describe('after a partial reveal', () => {
  it('a revealed clue exposes its player-safe wording only, never the private note or the linked truth', () => {
    const d = fresh();
    const c = d.clues.find((x) => x.id === 'clu-rail-sign') as Clue; // a hint toward the city's old identity
    Object.assign(c, { status: 'FOUND', visibility: 'REVEALED', discoveredSessionId: 'ses-3' });
    const recap = buildPlayerRecap(d, 'ses-3');
    expect(recap).toContain(c.playerTextMd);
    expect(recap).not.toContain(c.privateTextMd);
    expect(recap).not.toContain(c.title);
    expectClean(everythingPlayerFacing(d)); // rev-nyc itself stays hidden: no traversal of private edges
  });
  it('an export before the archive never names the old city or the other Embers', () => {
    const d = fresh();
    for (const c of d.clues.filter((x) => x.sessionIndex <= 6)) Object.assign(c, { status: 'FOUND', visibility: 'REVEALED', discoveredSessionId: `ses-${c.sessionIndex}` });
    for (const r of d.revelations.filter((x) => x.sessionIndex <= 5)) Object.assign(r, { status: 'INTERPRETED', visibility: 'REVEALED' });
    for (const n of d.npcs) Object.assign(n, { status: 'MET', visibility: 'PLAYER_SAFE' });
    const out = [1, 2, 3, 4, 5, 6].map((i) => buildPlayerRecap(d, `ses-${i}`)).join('\n') + buildKnownNpcs(d);
    expectClean(out, ['Cinder', 'Mercy Decree', 'Tomas', 'F-17', 'Ilan', 'Rook']); // those were legitimately revealed by now
    expect(out).toContain('Mara Venn');
    expect(scanSpoilers(out, d.revelations)).toEqual([]);
  });
  it('a revealed revelation shares its approved summary, not the DM truth', () => {
    const d = fresh();
    const r = d.revelations.find((x) => x.id === 'rev-embers') as Revelation;
    Object.assign(r, { status: 'INTERPRETED', visibility: 'REVEALED' });
    const recap = buildPlayerRecap(d, 'ses-8');
    expect(recap).toContain(r.playerSafeSummaryMd);
    expect(recap).not.toContain(r.privateTruthMd);
    expect(recap).not.toMatch(/Vesperdeep|Aureth|Concordance|New York/);
    expect(scanSpoilers(recap, d.revelations)).toEqual([]);
  });
  it('revoking a reveal removes it from every player surface again', () => {
    const d = fresh();
    const r = d.revelations.find((x) => x.id === 'rev-nyc') as Revelation;
    Object.assign(r, { status: 'INTERPRETED', visibility: 'REVEALED' });
    expect(everythingPlayerFacing(d)).toContain('New York');
    Object.assign(r, { visibility: 'DM_ONLY' });
    expectClean(everythingPlayerFacing(d));
    Object.assign(r, { visibility: 'REVEALED', status: 'NOT_SEEN' }); // revealed flag without the table having grasped it
    expect(scanSpoilers('We walked through old New York.', d.revelations).map((h) => h.term)).toEqual(['New York']);
  });
});

describe('NPCs, notes and character sheets', () => {
  it('a shared NPC exposes name, role and public text only', () => {
    const d = fresh();
    const mara = d.npcs.find((n) => n.id === 'npc-mara') as NPC;
    Object.assign(mara, { visibility: 'PLAYER_SAFE', status: 'MET' });
    const out = buildKnownNpcs(d);
    expect(out).toContain('Mara Venn');
    expect(out).toContain(mara.publicInfoMd);
    expect(out).not.toContain(mara.privateInfoMd);
    expect(out).not.toMatch(/Cinder|coordinator|ORS infiltration/);
  });
  it('DM-only notes and rule calls stay out of the recap; shared notes go in', () => {
    const d = fresh();
    const ev = (id: string, visibility: string, textMd: string, kind = 'EVENT') =>
      ({ id, campaignId: 'solmourn', createdAt: '', updatedAt: '', revision: 1, sessionId: 'ses-1', happenedAt: '', kind, textMd, visibility, linkedEntityIds: [] }) as unknown as SessionEvent;
    d.events.push(ev('e1', 'DM_ONLY', 'SECRET-DM-NOTE'), ev('e2', 'PLAYER_SAFE', 'The party freed the people in the lift.'), ev('e3', 'PLAYER_SAFE', 'Ruled jump distance', 'RULING'));
    const recap = buildPlayerRecap(d, 'ses-1');
    expect(recap).toContain('freed the people in the lift');
    expect(recap).not.toContain('SECRET-DM-NOTE');
    expect(recap).not.toContain('Ruled jump distance');
  });
  it('character sheet export never includes the DM secrets field', () => {
    const pc = { ...blankPc(), id: 'p', name: 'Rin', notesMd: 'Wants to stop heat cuts.', privateNotesMd: 'Secret: SECRET-PC-NOTE' } as unknown as PC;
    const out = buildCharacterSheet(pc);
    expect(out).toContain('Wants to stop heat cuts.');
    expect(out).not.toContain('SECRET-PC-NOTE');
  });
});

describe('spoiler scanner (second safety net)', () => {
  const d = fresh();
  it('flags unrevealed terms that a DM typed into player-facing text', () => {
    const hits = scanSpoilers('We found a map of old Manhattan, heard of Vesperdeep and the nine Embers.', d.revelations);
    expect(hits.map((h) => h.term).sort()).toEqual(['Embers', 'Manhattan', 'Vesperdeep']);
  });
  it('matches whole words only', () => {
    expect(scanSpoilers('We remember the embers of the fire; the community held.', d.revelations).map((h) => h.term)).toEqual(['Embers']);
    expect(scanSpoilers('Remember the community.', d.revelations)).toEqual([]);
  });
});
