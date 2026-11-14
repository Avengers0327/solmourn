// Story Bible §16: mandatory canon regression assertions, plus the consistency checker.
import { describe, expect, it } from 'vitest';
import { freshData, readBible, seedV2 } from './fixtures/seedV2';
import { runStructuralChecks, runTextRules, type CheckTarget } from '../src/domain/canon';
import { blankPc } from '../src/data/blank';
import { bibleToLore } from '../src/seed/helpers';
import type { Branch, CanonDecision, CanonRule, Clock, Clue, Location, LoreEntry, NPC, PC, Revelation, Scene, Session, TimelineEntry } from '../src/domain/types';

const d = freshData();
const T = d as unknown as Record<string, Record<string, unknown>[]>;
const sessions = T.sessions as unknown as Session[];
const locations = T.locations as unknown as Location[];
const lore = T.lore as unknown as LoreEntry[];
const npcs = T.npcs as unknown as NPC[];
const rules = T.canonRules as unknown as CanonRule[];
const loc = (id: string) => locations.find((l) => l.id === id)!;
const target = (text: string, id = 'x'): CheckTarget => ({ table: 'lore', id, label: 'Test', field: 'bodyMd', text });
const ids = (text: string, id?: string) => runTextRules(rules, [target(text, id)]).map((f) => f.ruleId);

describe('Bible §16 checklist against the seed', () => {
  it('exactly FIFTEEN sessions, unstarted, DM-only, with prep cards and scenes', () => {
    expect(sessions).toHaveLength(15);
    expect(sessions.map((s) => s.index)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    expect(sessions.every((s) => s.status === 'PLANNED' && s.visibility === 'DM_ONLY' && s.prepMd.length > 400 && s.canonStatus === 'WORKING')).toBe(true);
    const scenes = T.scenes as unknown as Scene[];
    for (const s of sessions) {
      const mine = scenes.filter((x) => x.sessionId === s.id);
      expect(mine.length, s.title).toBeGreaterThanOrEqual(4);
      expect(mine[0].readAloudMd.length, `${s.title} read-aloud`).toBeGreaterThan(60);
    }
    expect(sessions[0]).toMatchObject({ title: 'Blackout in Frostward', arc: 'Arc I - The Blackout', levelRange: '3' });
    expect(sessions[5].title).toBe('The Mercy Decree');
  });
  it('five arcs across the fifteen sessions', () => {
    expect([...new Set(sessions.map((s) => s.arc))]).toHaveLength(5);
  });
  it('exactly NINE Embers with the final political identities', () => {
    const embers = locations.filter((l) => l.id.startsWith('loc-ember-'));
    expect(embers.map((e) => e.name).sort()).toEqual(['Aureth', 'Azmara', 'Caldris', 'Kharos', 'Namaris', 'Orrakai', 'Sevrin', 'Vesperdeep']);
    expect(embers.length + 1).toBe(9); // plus Solmourn
    expect(embers.every((e) => e.visibility === 'DM_ONLY' && e.canonStatus === 'LOCKED' && /OPEN:/.test(e.bodyMd))).toBe(true);
    expect(loc('loc-ember-kharos').bodyMd).toMatch(/Military dictatorship/);
    expect(loc('loc-ember-aureth').bodyMd).toMatch(/Scholarly republic/);
    expect(loc('loc-ember-vesperdeep').bodyMd).toMatch(/Technocratic federation/);
    expect(loc('loc-ember-azmara').bodyMd).toMatch(/Lagos/);
  });
  it('Aureth only suspects; nobody can teach Concordance', () => {
    expect(loc('loc-ember-aureth').bodyMd).toMatch(/suspects/);
    expect(loc('loc-ember-aureth').bodyMd).toMatch(/cannot prove it, reproduce it, name it/);
    const r = (T.revelations as unknown as Revelation[]).find((x) => x.id === 'rev-collective')!;
    expect(r.privateTruthMd).toMatch(/Completely lost/);
    expect(r.whoKnowsMd).toMatch(/No one/);
  });
  it('six rings summing to 54 million; Frostward is dense city, not the Wastes', () => {
    const pops = [['loc-sanctum', 8_000], ['loc-crown', 392_000], ['loc-gilded', 1_600_000], ['loc-wards', 7_000_000], ['loc-foundries', 15_000_000], ['loc-frostward', 30_000_000]] as const;
    let sum = 0;
    for (const [id, n] of pops) {
      expect(loc(id).bodyMd, id).toContain(`**Population:** ${n.toLocaleString('en-US')}`);
      sum += n;
    }
    expect(sum).toBe(54_000_000);
    expect(loc('loc-solmourn').bodyMd).toContain('54,000,000');
    expect(loc('loc-frostward').bodyMd).toMatch(/NOT the Wastes/);
    expect(loc('loc-frostward').bodyMd).toMatch(/dense/i);
    expect(loc('loc-wastes').id).not.toBe('loc-frostward');
  });
  it('Solmourn = New York, Everflame over Midtown, DM-only alias', () => {
    expect(loc('loc-solmourn').bodyMd).toMatch(/New York City/);
    expect(loc('loc-solmourn').bodyMd).toMatch(/Midtown Manhattan/);
    expect(loc('loc-solmourn').playerMd).not.toMatch(/New York|Manhattan|Mahwah/);
  });
  it('timeline: Sundering ~2230, nine simultaneous lights, isolation ~50 AS, present 700 AS', () => {
    const tl = T.timeline as unknown as TimelineEntry[];
    const by = (id: string) => tl.find((t) => t.id === id)!;
    expect(by('tl-sundering').title).toBe('The Sundering');
    expect(by('tl-sundering').bodyMd).toMatch(/not destroyed/);
    expect(by('tl-first-concordance').bodyMd).toMatch(/nine artificial suns/);
    expect(by('tl-first-concordance').bodyMd).toMatch(/simultaneous/);
    expect(by('tl-first-concordance').bodyMd).toMatch(/stabilize and maintain/);
    expect(by('tl-isolation').whenLabel).toBe('~50 AS');
    expect(by('tl-contact-collapse').whenLabel).toBe('~300-400 AS');
    expect(by('tl-present').whenLabel).toMatch(/700 AS/);
    expect(by('tl-reign').canonStatus).toBe('WORKING');
  });
  it('Seraphine is absolute and LOCKED; House Vael heirs and officials stay WORKING', () => {
    const by = (id: string) => npcs.find((n) => n.id === id)!;
    expect(by('npc-seraphine')).toMatchObject({ canonStatus: 'LOCKED', visibility: 'PLAYER_SAFE' });
    expect(by('npc-seraphine').mistakenBeliefsMd).toMatch(/does \*\*not\*\* know the other Embers exist/);
    for (const id of ['npc-aurelia', 'npc-lucien', 'npc-hadrian', 'npc-veyr', 'npc-voss', 'npc-thane', 'npc-saren', 'npc-corven', 'npc-mara', 'npc-tarin', 'npc-elara']) expect(by(id).canonStatus, id).toBe('WORKING');
    expect(by('npc-aurelia').privateInfoMd).toMatch(/not a secret rebel/);
    expect(by('npc-elara').privateInfoMd).toMatch(/does \*\*not\*\* understand Concordance/);
  });
  it('legacy names are RETIRED and kept only as DM-only history', () => {
    for (const id of ['npc-tomas', 'npc-joren', 'npc-seren']) expect(npcs.find((n) => n.id === id)!).toMatchObject({ canonStatus: 'RETIRED', visibility: 'DM_ONLY', publicInfoMd: '' });
    expect(loc('loc-f17')).toMatchObject({ canonStatus: 'RETIRED', visibility: 'DM_ONLY' });
    expect(loc('loc-opening-station')).toMatchObject({ name: 'Frostward Thermal Exchange 17', canonStatus: 'LOCKED' });
    expect(loc('loc-opening-station').bodyMd).toMatch(/not the retired Station F-17/);
    expect(loc('loc-f17').bodyMd).toMatch(/do not merge their histories/);
  });
  it('no current campaign material uses the retired names or the legacy count', () => {
    const current = JSON.stringify([T.sessions, T.scenes, T.clues, T.branches, T.lessons, T.revelations]);
    // The only allowed mention is the warning that F-17 is retired.
    const cleaned = current.replace(/(the )?retired Station F-17/g, 'RETIRED');
    for (const w of ['Tomas', 'Joren', 'Seren', 'Vale', 'F-17', 'First Flicker', '43']) expect(cleaned, w).not.toMatch(new RegExp(`\\b${w}\\b`));
    const mara = npcs.find((n) => n.id === 'npc-mara')!;
    expect(mara.privateInfoMd).toMatch(/Cinder Network coordinator, former Foundries logistics/);
    expect(mara.privateInfoMd).toMatch(/\*\*not\*\* the legacy kit's missing engineer's sister/);
    expect(mara.wants).not.toMatch(/brother/);
  });
  it('owner decisions are recorded; genuinely unresolved ones stay OPEN', () => {
    const decs = T.canonDecisions as unknown as CanonDecision[];
    const by = (id: string) => decs.find((x) => x.id === id)!;
    expect(by('dec-mara-role')).toMatchObject({ status: 'LOCKED' });
    expect(by('dec-legacy-retired')).toMatchObject({ status: 'LOCKED' });
    for (const id of ['dec-sundering-public', 'dec-exchange-17', 'dec-seven-workers']) {
      expect(by(id).status, id).toBe('LOCKED');
      expect(by(id).selectedOption, id).toBeTruthy();
    }
    for (const id of ['dec-species-sources', 'dec-species-2024']) expect(by(id).status, id).toBe('OPEN');
    // the superseded OPEN versions are gone
    expect(decs.some((x) => ['dec-missing-workers', 'dec-opening-station', 'dec-sundering-term', 'dec-missing-43', 'dec-mara', 'dec-legacy-names'].includes(x.id))).toBe(false);
    expect(by('dec-seven-workers').rejected).toEqual(['43 missing residents (legacy)']);
  });
  it('the opening station is not named after the "42 ST" New York clue', () => {
    expect(JSON.stringify([T.locations, T.sessions, T.scenes])).not.toMatch(/Forty-?Two|Station 42/i);
  });
  it('the Mercy Decree branch: ~84,000; open defiance alone makes the party wanted', () => {
    const b = (T.branches as unknown as Branch[]).find((x) => x.id === 'br-6-decree')!;
    expect(b.canonStatus).toBe('LOCKED');
    expect(b.preconditionMd).toMatch(/84,000/);
    const defy = b.options.find((o) => o.id === 'defy')!;
    expect(defy.stateChangesMd).toMatch(/immediate enemies of the state/);
    for (const o of b.options.filter((x) => x.id !== 'defy')) expect(o.stateChangesMd, o.id).toMatch(/Not wanted/);
    expect(b.recoveryMd.length).toBeGreaterThan(20);
  });
  it('every branch has options, state changes, downstream effects and a recovery path; none is pre-decided', () => {
    const bs = T.branches as unknown as Branch[];
    expect(bs.length).toBeGreaterThanOrEqual(15);
    for (const b of bs) {
      expect(b.options.length, b.id).toBeGreaterThanOrEqual(3);
      expect(b.recoveryMd, b.id).toBeTruthy();
      expect(b.chosenOptionId, b.id).toBeUndefined();
      expect(b.preconditionMd, b.id).toBeTruthy();
    }
    expect(new Set(bs.map((b) => b.sessionIndex)).size).toBe(15);
  });
  it('the Old Relay is a communications relic, and the Cinders are one local network', () => {
    expect(loc('loc-relay-workshop').bodyMd).toMatch(/not a Concordance device, not a readable map/);
    const cinders = lore.find((l) => l.id === 'fac-cinders')!;
    expect(cinders.bodyMd).toMatch(/one organized underground/);
    expect(cinders.bodyMd).toMatch(/Founded entirely within Solmourn/);
  });
  it('clocks start 1/6, 0/6, 1/6 and nothing is auto-advanced', () => {
    const clocks = T.clocks as unknown as Clock[];
    expect(clocks.filter((c) => c.group === 'core').map((c) => [c.name, c.value, c.max])).toEqual([['Everflame deterioration', 1, 6], ['ORS scrutiny', 0, 6], ['Public unrest', 1, 6]]);
    expect(clocks.every((c) => c.reasonHistory.length === 0 && c.canonStatus === 'WORKING')).toBe(true);
  });
  it('Embers is the locked collective name; open questions stay open', () => {
    const decs = T.canonDecisions as unknown as CanonDecision[];
    const name = decs.find((x) => x.id === 'dec-embers-name')!;
    expect(name).toMatchObject({ status: 'LOCKED', selectedOption: 'Embers' });
    expect(name.rejected).toEqual(['Pyres', 'havens']);
    for (const id of ['dec-prophecy', 'dec-ending', 'dec-foreign-embers']) {
      expect(decs.find((x) => x.id === id)!.status, id).toBe('OPEN');
      expect(decs.find((x) => x.id === id)!.selectedOption, id).toBeUndefined();
    }
    expect(decs.find((x) => x.id === 'dec-ascendancy')!.status).toBe('WORKING');
  });
  it('the Unbound is OPEN, with no approved summary and no chosen PC', () => {
    const r = (T.revelations as unknown as Revelation[]).find((x) => x.id === 'rev-unbound')!;
    expect(r.canonStatus).toBe('OPEN');
    expect(r.playerSafeSummaryMd).toBe('');
    expect(JSON.stringify(blankPc())).not.toMatch(/unbound|chosen|prophecy/i);
  });
  it('the map revelation is history, not present-day status', () => {
    const r = (T.revelations as unknown as Revelation[]).find((x) => x.id === 'rev-embers')!;
    expect(r.privateTruthMd).toMatch(/does not show whether any other still functions/);
    expect(r.playerSafeSummaryMd).toMatch(/Whether any still exists is unknown/);
  });
  it('every revelation with a summary has three or more clue routes; critical ones have required clues', () => {
    const clues = T.clues as unknown as Clue[];
    for (const r of T.revelations as unknown as Revelation[]) {
      const n = clues.filter((c) => c.revelationIds.includes(r.id)).length;
      expect(n, r.title).toBeGreaterThanOrEqual(3);
    }
    for (const c of clues) for (const id of c.revelationIds) expect((T.revelations as unknown as Revelation[]).some((r) => r.id === id), `${c.id} → ${id}`).toBe(true);
  });
  it('every seeded record has a source and (where it is a canon claim) a status', () => {
    for (const name of ['sessions', 'scenes', 'npcs', 'locations', 'lore', 'clues', 'revelations', 'timeline', 'canonDecisions', 'branches', 'lessons', 'statCards', 'clocks']) {
      for (const r of T[name]) expect(r.sourceRef, `${name}/${r.id}`).toBeTruthy();
    }
    for (const name of ['sessions', 'scenes', 'npcs', 'locations', 'lore', 'clues', 'revelations', 'timeline', 'branches', 'statCards']) {
      for (const r of T[name]) expect(r.canonStatus, `${name}/${r.id}`).toBeTruthy();
    }
  });
  it('authored prep is never LOCKED unless it cites a locked bible anchor', () => {
    for (const name of ['scenes', 'clues', 'statCards', 'lessons']) for (const r of T[name]) expect(r.canonStatus, `${name}/${r.id}`).not.toBe('LOCKED');
    for (const r of [...T.branches, ...T.revelations, ...T.npcs, ...T.locations]) {
      if (r.canonStatus === 'LOCKED') expect(String(r.sourceRef), String(r.id)).toMatch(/SOLMOURN_CANONICAL_DM_STORY_BIBLE\.md §|Owner decision 2026-11-13/);
    }
  });
});

describe('Divergence amendment', () => {
  it('is extracted verbatim, DM-only, with framework LOCKED and details WORKING', () => {
    const div = lore.filter((l) => l.id.startsWith('div-'));
    expect(div.map((l) => [l.id, l.canonStatus])).toEqual([['div-1', 'LOCKED'], ['div-2', 'LOCKED'], ['div-3', 'WORKING'], ['div-4', 'LOCKED'], ['div-5', 'WORKING'], ['div-6', 'LOCKED'], ['div-7', 'LOCKED']]);
    expect(div.every((l) => l.visibility === 'DM_ONLY')).toBe(true);
  });
  it('marks every bible section that stated human-only as amended, without editing its text', () => {
    const amended = lore.filter((l) => l.id.startsWith('bible-') && l.bodyMd.includes('Amended by Canon Amendment 001'));
    expect(amended.map((l) => l.id)).toEqual(expect.arrayContaining(['bible-0-2', 'bible-5-2', 'bible-11-1', 'bible-16']));
    const bible = readBible();
    for (const l of amended) expect(bible).toContain(l.bodyMd.split('\n\n').slice(-1)[0]);
  });
  it('changes nothing else: nine Embers, six classes, fifteen sessions', () => {
    expect(locations.filter((l) => l.id.startsWith('loc-ember-'))).toHaveLength(8);
    expect(sessions).toHaveLength(15);
    expect(JSON.stringify(T.timeline)).toMatch(/It created no Embers and explains nothing about Concordance/);
  });
});

describe('the bible is the single source of truth for lore', () => {
  const bible = readBible();
  const entries = bibleToLore(bible);
  it('extracts every numbered subsection verbatim, DM-only, with its section as source', () => {
    expect(entries.length).toBeGreaterThan(50);
    expect(entries.every((e) => e.visibility === 'DM_ONLY' && e.playerMd === '' && /§ \d+/.test(e.sourceRef!))).toBe(true);
    const nine = entries.find((e) => e.id === 'bible-1-2')!;
    expect(nine.title).toBe('The nine first lights');
    expect(nine.canonStatus).toBe('LOCKED');
    expect(bible).toContain(nine.bodyMd.split('\n\n')[1]);
  });
  it('preserves each status label exactly', () => {
    const by = (id: string) => entries.find((e) => e.id === id)!;
    expect(by('bible-4-3').canonStatus).toBe('OPEN');
    expect(by('bible-5-3').canonStatus).toBe('PLAYTEST');
    expect(by('bible-10-3').canonStatus).toBe('WORKING');
    expect(by('bible-7-2').canonStatus).toBe('LOCKED');
    expect(by('bible-6-3').bodyMd).toMatch(/LOCKED principle; WORKING roster/);
  });
  it('ships the bible itself as a DM-only document', () => {
    const doc = (seedV2().tables.docs as { id: string; visibility: string; bodyMd: string }[]).find((x) => x.id === 'doc-bible')!;
    expect(doc.visibility).toBe('DM_ONLY');
    expect(doc.bodyMd).toBe(bible);
  });
});

describe('consistency checker', () => {
  it('the authored seed passes every rule', () => {
    const targets: CheckTarget[] = [];
    const add = (table: string, fields: string[]) => {
      for (const r of T[table]) {
        if (String(r.sourceRef).startsWith('SOLMOURN_CANONICAL_DM_STORY_BIBLE.md §') && table === 'lore' && String(r.id).startsWith('bible-')) continue;
        for (const f of fields) if (typeof r[f] === 'string' && r[f]) targets.push({ table: table as never, id: r.id as string, label: String(r.title ?? r.name), field: f, text: r[f] as string });
      }
    };
    add('lore', ['title', 'bodyMd', 'playerMd']);
    add('timeline', ['title', 'bodyMd']);
    add('npcs', ['publicInfoMd', 'privateInfoMd', 'knowsMd', 'mistakenBeliefsMd']);
    add('locations', ['bodyMd', 'playerMd']);
    add('clues', ['title', 'privateTextMd', 'playerTextMd']);
    add('revelations', ['title', 'privateTruthMd', 'playerSafeSummaryMd', 'prevailingBeliefMd', 'whoKnowsMd']);
    add('scenes', ['descriptionMd', 'readAloudMd']);
    add('sessions', ['questionMd', 'prepMd']);
    add('lessons', ['bodyMd']);
    add('statCards', ['attacksMd', 'traitsMd', 'tacticsMd']);
    expect(runTextRules(rules, targets).map((f) => `${f.ruleId} @ ${f.id}: ${f.evidence}`)).toEqual([]);
    expect(runStructuralChecks(T.canonDecisions as unknown as CanonDecision[], [])).toEqual([]);
  });
  it('never eight: suns, Embers or sessions', () => {
    expect(ids('Eight artificial suns appeared.')).toContain('r2-nine');
    expect(ids('The eight Embers endure.')).toContain('r2-nine');
    expect(ids('Nine artificial suns appeared.')).toEqual([]);
    expect(ids('Eight other cities once existed.')).toEqual([]);
    expect(ids('An eight-session campaign.')).toContain('r2-sessions');
  });
  it('rejected names, capitalization and population', () => {
    expect(ids('The Pyres still burn.')).toContain('r2-collective');
    expect(ids('Candidates: Pyres, havens.', 'dec-embers-name')).toEqual([]);
    const [f] = runTextRules(rules, [target('After the SUNDering the sky went dark.')]);
    expect(f.replace).toEqual({ from: 'SUNDering', to: 'Sundering' });
    expect(ids('A city of 12 million.')).toContain('r2-population');
    expect(ids('The Cinder Network moved the crates.')).toEqual([]); // Cinders is now the resistance, not a flagged name
  });
  it('the sun, the suns and the Everflame', () => {
    expect(ids('The sun was destroyed long ago.')).toContain('r2-sun-destroyed');
    expect(ids('The sun was not destroyed; its light is obstructed.')).toEqual([]);
    expect(ids('Engineers built the artificial suns.')).toContain('r2-suns-built');
    expect(ids('A traitor arranged the sabotage of the Everflame.')).toContain('r2-sabotage');
    expect(ids('It is failing from age, not sabotage of the Everflame.')).toEqual([]);
  });
  it('Concordance cannot be known or taught', () => {
    expect(ids('An Aureth scholar teaches Concordance to the party.')).toContain('r2-concordance-known');
    expect(ids('They find a Concordance manual.')).toContain('r2-concordance-known');
    expect(ids('Nobody alive understands what happened that night.')).toEqual([]);
  });
  it('monarchy, dynasty, Frostward, monsters, gods', () => {
    expect(ids('Solmourn is a constitutional monarchy.')).toContain('r2-monarchy');
    expect(ids('The council can veto the Empress.')).toContain('r2-monarchy');
    expect(ids('A rebel princess leads the coup.')).toContain('r2-dynasty');
    expect(ids('Frostward is an empty wasteland.')).toContain('r2-frostward');
    expect(ids('A Dissonance demon stalks the tunnels.')).toContain('r2-monsters');
    expect(ids('An elf merchant.')).toEqual([]); // species are peoples now (Divergence amendment)
    expect(ids('Undead hordes pour from the tunnels.')).toContain('r2-monsters');
    expect(ids('All player characters are human.')).toContain('r2-human-only');
    expect(ids('Goblins are inferior.')).toContain('r2-species-caste');
    expect(ids('Her family came from the Feywild.')).toContain('r2-planes');
    expect(ids('The gods answer her prayer with divine magic.')).toContain('r2-divine');
    expect(ids('Rin is the chosen one.')).toContain('r2-chosen');
  });
  it('findings are reports with evidence; nothing is edited', () => {
    const t = target('The Pyres wait.');
    const [f] = runTextRules(rules, [t]);
    expect(t.text).toBe('The Pyres wait.');
    expect(f.evidence).toBe('The Pyres wait.');
    expect(f.suggestion).toBeTruthy();
  });
  it('structural checks: rejected option selected, non-human PC', () => {
    const dec = { ...(T.canonDecisions as unknown as CanonDecision[])[0], selectedOption: 'Pyres' };
    expect(runStructuralChecks([dec], []).map((f) => f.ruleId)).toEqual(['decision-rejected']);
    const elf = { ...blankPc(), id: 'p', ancestry: 'Elf', species: { entryId: 'srd-high-elf', choiceId: 'light' } } as unknown as PC;
    expect(runStructuralChecks([], [elf])).toEqual([]);
    const bogus = { ...blankPc(), id: 'q', ancestry: 'Elf', species: { entryId: 'homebrew-elf' } } as unknown as PC;
    expect(runStructuralChecks([], [bogus]).map((f) => f.ruleId)).toEqual(['pc-species']);
  });
});
