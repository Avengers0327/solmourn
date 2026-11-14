import { describe, expect, it } from 'vitest';
import { PATTERNS } from '../src/content/spells';
import { CLASSES, DEVICES } from '../src/content/classes';
import { RP_COST } from '../src/content/rules';
import { blankPc } from '../src/data/blank';
import {
  applyCast, applyRest, calcCast, canAddToBook, canPrepare, castInputFor, getRes, maxPatternLevel, proficiencyBonus, rpPool, syncResources,
  useFeature, validateControlledTrial,
} from '../src/domain/rules';
import type { PC } from '../src/domain/types';
import { seedV2 } from './fixtures/seedV2';
import { ORIGINAL_PATTERNS, SPELLS, coverageReport, normalizePatternId } from '../src/content/spells';
import { derive, hpAtLevel, pointBuyCost, validateDraft, validateScores, type Draft } from '../src/domain/creation';
import type { TrialConfig } from '../src/domain/rules';

const pc = (patch: Partial<PC>): PC => {
  const p = { ...blankPc(), id: 'pc-test', campaignId: 'solmourn', createdAt: '', updatedAt: '', revision: 1, ...patch } as PC;
  return { ...p, resources: syncResources({ ...p, resources: [] }) };
};
const resonant = (patch: Partial<PC> = {}) => pc({ classId: 'resonant', level: 3, attunement: 'RADIANCE', ...patch });
const withRp = (p: PC, rp: number): PC => ({ ...p, resources: p.resources.map((r) => (r.key === 'rp' ? { ...r, current: rp } : r)) });

describe('core numbers', () => {
  it('proficiency bonus is +2 at level 3', () => {
    expect(proficiencyBonus(3)).toBe(2);
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(20)).toBe(6);
  });
  it('RP tables match the Player Guide', () => {
    expect([...RP_COST]).toEqual([0, 2, 3, 5, 6, 7, 9, 10, 11, 13]);
    expect(rpPool(3)).toBe(14);
    expect(rpPool(20)).toBe(133);
    expect(maxPatternLevel(3)).toBe(2);
    expect(maxPatternLevel(17)).toBe(9);
  });
  it('stone shape is a 4th-level Form Pattern', () => {
    const p = PATTERNS.find((x) => x.name === 'Stone Shape')!;
    expect(p.level).toBe(4);
    expect(p.discipline).toBe('FORM');
    expect(PATTERNS.some((x) => x.name === 'Stone Shape' && x.level === 3)).toBe(false);
  });
});

describe('casting and overcasting (Phase 2 acceptance)', () => {
  const r = resonant();
  it('a level-3 Resonant has 14 RP, 2 Amplification uses, Emergency ready', () => {
    expect(getRes(r, 'rp')).toMatchObject({ current: 14, max: 14 });
    expect(getRes(r, 'amp')?.current).toBe(2);
    expect(getRes(r, 'emergency')?.current).toBe(1);
  });
  it('casts a level-2 Pattern for 3 RP', () => {
    const res = calcCast(castInputFor(r, 2));
    expect(res).toMatchObject({ ok: true, totalCost: 3, rpAfter: 11, strain: null, conDc: null });
  });
  it('+2 Amplification adds 4 RP, 2d6 strain, DC 15 and uses one of two', () => {
    const res = calcCast(castInputFor(r, 2, { ampTier: 2 }));
    expect(res).toMatchObject({ ok: true, baseCost: 3, ampCost: 4, totalCost: 7, strain: '2d6', conDc: 15, usesAmp: true });
    const after = applyCast(r, res);
    expect(after.ok && getRes(after.value, 'amp')?.current).toBe(1);
    expect(after.ok && getRes(after.value, 'rp')?.current).toBe(7);
  });
  it('all four tiers match the table', () => {
    const rich = withRp(resonant({ level: 9 }), 57);
    expect([1, 2, 3, 4].map((t) => calcCast(castInputFor(rich, 1, { ampTier: t as 1 })))
      .map((x) => [x.ampCost, x.strain, x.conDc])).toEqual([[2, '1d6', 12], [4, '2d6', 15], [6, '4d6', 18], [8, '6d6', 21]]);
  });
  it('a 0 RP cantrip is legal; amplifying it costs only the bonus RP and still strains', () => {
    expect(calcCast(castInputFor(r, 0))).toMatchObject({ ok: true, totalCost: 0 });
    expect(calcCast(castInputFor(r, 0, { ampTier: 1 }))).toMatchObject({ ok: true, totalCost: 2, strain: '1d6', conDc: 12 });
  });
  it('Amplification is refused with no uses left', () => {
    const spent = { ...r, resources: r.resources.map((x) => (x.key === 'amp' ? { ...x, current: 0 } : x)) };
    expect(calcCast(castInputFor(spent, 1, { ampTier: 1 })).ok).toBe(false);
  });
  it('Emergency Overcasting borrows at most 2 missing RP: 1d6 each, DC 10 + 2 per RP', () => {
    const low = withRp(r, 1);
    const res = calcCast(castInputFor(low, 2, { emergency: true }));
    expect(res).toMatchObject({ ok: true, borrowed: 2, totalCost: 1, rpAfter: 0, strain: '2d6', conDc: 14, usesEmergency: true });
    expect(calcCast(castInputFor(withRp(r, 2), 2, { emergency: true }))).toMatchObject({ ok: true, borrowed: 1, conDc: 12 });
    expect(calcCast(castInputFor(withRp(r, 0), 2, { emergency: true })).ok).toBe(false); // missing 3
    expect(calcCast(castInputFor(r, 2, { emergency: true })).ok).toBe(false); // nothing missing
    const after = applyCast(low, res);
    expect(after.ok && getRes(after.value, 'emergency')?.current).toBe(0);
  });
  it('Emergency Overcasting cannot stack with Amplification', () => {
    const res = calcCast(castInputFor(withRp(r, 1), 2, { emergency: true, ampTier: 1 }));
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/cannot be combined/i);
  });
  it('overcasting never grants a higher Pattern level', () => {
    expect(calcCast(castInputFor(r, 3, { ampTier: 4 })).ok).toBe(false);
    expect(calcCast(castInputFor(withRp(r, 4), 3, { emergency: true })).ok).toBe(false);
  });
  it('Pattern levels 6-9 are once per long rest, and level 9 can be amplified', () => {
    const high = resonant({ level: 17 });
    const first = calcCast(castInputFor(high, 9, { ampTier: 1 }));
    expect(first).toMatchObject({ ok: true, totalCost: 15, marksHighLevel: 9 });
    const after = applyCast(high, first);
    if (!after.ok) throw new Error('cast failed');
    expect(calcCast(castInputFor(after.value, 9)).ok).toBe(false);
    expect(calcCast(castInputFor(after.value, 8)).ok).toBe(true);
    expect(calcCast(castInputFor(applyRest(after.value, 'LONG'), 9)).ok).toBe(true);
  });
  it('a failed calculation is never applied', () => {
    expect(applyCast(r, calcCast(castInputFor(r, 5))).ok).toBe(false);
  });
});

describe('Patternbook legality', () => {
  const r = resonant();
  const byName = (n: string) => PATTERNS.find((p) => p.name === n)!;
  it('a Radiance caster cannot take a Vitality Pattern', () => {
    expect(canAddToBook(r, byName('Cure Wounds')).ok).toBe(false);
    expect(canAddToBook(r, byName('Scorching Ray')).ok).toBe(true);
  });
  it('cannot take Patterns above the accessible level', () => {
    expect(canAddToBook(r, byName('Fireball')).ok).toBe(false);
  });
  it('preparing requires the Pattern to be in the book', () => {
    expect(canPrepare(r, byName('Scorching Ray')).ok).toBe(false);
    expect(canPrepare({ ...r, patternIds: [byName('Scorching Ray').id] }, byName('Scorching Ray')).ok).toBe(true);
  });
  it('non-Resonants and Unattuned characters have no Patternbook', () => {
    expect(canAddToBook(pc({ classId: 'warden', attunement: 'RADIANCE' }), byName('Fire Bolt')).ok).toBe(false);
    expect(canAddToBook(resonant({ attunement: 'UNATTUNED' }), byName('Fire Bolt')).ok).toBe(false);
  });
});

describe('class resources and rests', () => {
  it('Votary Field Treatment consumes an ability use AND a healer-kit charge', () => {
    const v = pc({ classId: 'votary', level: 3 });
    expect(getRes(v, 'votary:field-treatment')?.current).toBe(2);
    expect(getRes(v, 'healer-kit')?.current).toBe(10);
    const used = useFeature(v, 'votary:field-treatment');
    if (!used.ok) throw new Error(used.error);
    expect(getRes(used.value, 'votary:field-treatment')?.current).toBe(1);
    expect(getRes(used.value, 'healer-kit')?.current).toBe(9);
    const noKit = { ...v, resources: v.resources.map((x) => (x.key === 'healer-kit' ? { ...x, current: 0 } : x)) };
    expect(useFeature(noKit, 'votary:field-treatment').ok).toBe(false);
  });
  it('Machinist Shock Projector replaces one attack and is never a free action', () => {
    const d = DEVICES.find((x) => x.id === 'shock-projector')!;
    expect(d.actionEconomy).toBe('REPLACES_ATTACK');
    expect(d.actionText).toMatch(/replaces one attack/i);
  });
  it('Machinist devices each get PB activations, limited to the prepared slots', () => {
    const m = pc({ classId: 'machinist', level: 3, rigIds: ['shock-projector', 'stabilizer', 'pulse-scanner'] });
    const devices = m.resources.filter((x) => x.key.startsWith('device:'));
    expect(devices.map((x) => x.key)).toEqual(['device:shock-projector', 'device:stabilizer']);
    expect(devices.every((x) => x.max === 2)).toBe(true);
  });
  it('short rest restores short-rest resources only; long rest restores both', () => {
    let w = pc({ classId: 'warden', level: 7, hp: 5, maxHp: 60 });
    w = { ...w, resources: w.resources.map((x) => ({ ...x, current: 0 })) };
    const short = applyRest(w, 'SHORT');
    expect(getRes(short, 'warden:second-wind')?.current).toBe(1);
    expect(getRes(short, 'warden:intercept')?.current).toBe(0);
    expect(short.hp).toBe(5);
    const long = applyRest(w, 'LONG');
    expect(getRes(long, 'warden:intercept')?.current).toBe(3);
    expect(long.hp).toBe(60);
  });
  it('rests never refill non-recovering resources such as healer-kit charges', () => {
    let v = pc({ classId: 'votary', level: 3 });
    v = { ...v, resources: v.resources.map((x) => ({ ...x, current: 0 })) };
    expect(getRes(applyRest(v, 'LONG'), 'healer-kit')?.current).toBe(0);
    expect(getRes(applyRest(v, 'LONG'), 'votary:field-treatment')?.current).toBe(2);
  });
  it('a short rest does not restore RP or Amplification', () => {
    const r = withRp(resonant(), 0);
    expect(getRes(applyRest(r, 'SHORT'), 'rp')?.current).toBe(0);
    expect(getRes(applyRest(r, 'LONG'), 'rp')?.current).toBe(14);
  });
  it('all six classes are PLAYTEST and no class data assigns a destiny', () => {
    expect(CLASSES.map((c) => c.name)).toEqual(['Warden', 'Shade', 'Machinist', 'Resonant', 'Votary', 'Strider']);
    expect(CLASSES.every((c) => c.playtestStatus === 'PLAYTEST')).toBe(true);
    expect(JSON.stringify(blankPc())).not.toMatch(/unbound|chosen|prophecy/i);
  });
});

describe('controlled group technique', () => {
  const cfg = seedV2().meta!.find((m) => m.key === 'trialConfig') as { value: TrialConfig };
  const ok = { participants: ['A', 'B'], sources: ['Radiance', 'Form'], effect: 'Stabilize a failing device', usedSinceLongRest: 0 };
  it('accepts a small bounded effect', () => expect(validateControlledTrial(cfg.value, ok)).toEqual([]));
  it('needs two participants and two distinct sources', () => {
    expect(validateControlledTrial(cfg.value, { ...ok, participants: ['A'] }).length).toBe(1);
    expect(validateControlledTrial(cfg.value, { ...ok, sources: ['Radiance', 'radiance'] }).length).toBe(1);
  });
  it('is one group use per long rest', () => expect(validateControlledTrial(cfg.value, { ...ok, usedSinceLongRest: 1 }).length).toBe(1));
  it('cannot create a ninth sun or restore the planet', () => {
    expect(validateControlledTrial(cfg.value, { ...ok, effect: 'Create a ninth sun' }).length).toBe(1);
    expect(validateControlledTrial(cfg.value, { ...ok, effect: 'Restore the natural sun' }).length).toBe(1);
  });
});

describe('Resonance Pattern directory', () => {
  it('inventories the SRD 5.1 list in full and never silently drops a spell', () => {
    expect(SPELLS.filter((p) => p.origin === 'SRD')).toHaveLength(319);
    expect(SPELLS.filter((p) => p.origin === 'PHB').length).toBe(42);
    expect(new Set(SPELLS.map((p) => p.id)).size).toBe(SPELLS.length); // one row per distinct spell
    expect(SPELLS.every((p) => p.status === 'MAPPED' || (p.status === 'EXCLUDED' && !!p.excludedReason))).toBe(true);
    expect(PATTERNS.length + SPELLS.filter((p) => p.status === 'EXCLUDED').length).toBe(SPELLS.length);
  });
  it('coverage report accounts for every row under every book that prints it', () => {
    const cov = coverageReport();
    expect(cov.reduce((a, c) => a + c.total, 0)).toBe(SPELLS.reduce((a, p) => a + (p.sources?.length ?? 0), 0));
    expect(cov.every((c) => c.mapped + c.excluded === c.total && c.verified + c.unverified <= c.total)).toBe(true);
    expect(cov.filter((c) => c.code === 'PHB').map((c) => c.level)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it('RP cost follows the level table for every entry', () => {
    for (const p of SPELLS) expect(p.rpCost, p.name).toBe([0, 2, 3, 5, 6, 7, 9, 10, 11, 13][p.level]);
  });
  it('keeps the Player Guide discipline assignments', () => {
    const disc = (n: string) => SPELLS.find((p) => (p.publishedName ?? p.name).toLowerCase() === n.toLowerCase())?.discipline;
    const kit: Record<string, string[]> = {
      RADIANCE: ['Fire Bolt', 'Ray of Frost', 'Light', 'Shocking Grasp', 'Burning Hands', 'Chromatic Orb', 'Scorching Ray', 'Heat Metal', 'Fireball', 'Lightning Bolt'],
      KINESIS: ['Mage Hand', 'Blade Ward', 'Feather Fall', 'Jump', 'Shield', 'Levitate', 'Misty Step', 'Fly', 'Slow'],
      VITALITY: ['Spare the Dying', 'Poison Spray', 'Cure Wounds', 'Healing Word', 'Inflict Wounds', 'Lesser Restoration', 'Aid', 'Revivify', 'Mass Healing Word'],
      VEIL: ['Minor Illusion', 'Friends', 'Disguise Self', 'Charm Person', 'Silent Image', 'Invisibility', 'Suggestion', 'Major Image', 'Hypnotic Pattern'],
      FORM: ['Mending', 'Grease', 'Create or Destroy Water', 'Enlarge/Reduce', 'Alter Self', 'Meld into Stone', 'Stone Shape', 'Mold Earth'],
      ECHO: ['Guidance', 'True Strike', 'Detect Magic', 'Identify', 'Comprehend Languages', 'Detect Thoughts', 'Locate Object', 'Clairvoyance', 'Tongues'],
    };
    for (const [d, names] of Object.entries(kit)) for (const n of names) expect(disc(n), n).toBe(d);
  });
  it('excludes gods, summoning, other planes and resurrection; nothing is a group or secret Pattern', () => {
    for (const n of ['Commune', 'Conjure Celestial', 'Plane Shift', 'Animate Dead', 'True Resurrection', 'Wish', 'Time Stop']) {
      expect(SPELLS.find((p) => p.name === n)?.status, n).toBe('EXCLUDED');
    }
    expect(JSON.stringify(SPELLS)).not.toMatch(/Concordance|Unbound|Ember\b|New York/);
  });
  it('only licensed or original entries carry rules text', () => {
    expect(SPELLS.filter((p) => p.origin === 'SRD').every((p) => p.licensedTextAvailable && !!p.rulesMd && /SRD 5\.1/.test(p.source))).toBe(true);
    expect(SPELLS.filter((p) => p.origin === 'PHB' || p.origin === 'SUPPLEMENT').every((p) => !p.rulesMd && !p.licensedTextAvailable)).toBe(true);
    expect(ORIGINAL_PATTERNS).toHaveLength(12);
    expect(ORIGINAL_PATTERNS.every((p) => /PLAYTEST/.test(p.source) && !!p.rulesMd)).toBe(true);
    expect(new Set(ORIGINAL_PATTERNS.map((p) => p.discipline)).size).toBe(6);
  });
  it('every discipline gives a level-3 Resonant at least ten legal Patterns and three cantrips', () => {
    for (const d of ['RADIANCE', 'KINESIS', 'VITALITY', 'VEIL', 'FORM', 'ECHO']) {
      expect(PATTERNS.filter((p) => p.discipline === d && p.level >= 1 && p.level <= 2).length, d).toBeGreaterThanOrEqual(10);
      expect(PATTERNS.filter((p) => p.discipline === d && p.level === 0).length, d).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('level-3 character creation', () => {
  const draft = (patch: Partial<Draft> = {}): Draft => ({
    name: 'Rin', species: { entryId: 'srd-human' }, classId: 'machinist', method: 'ARRAY', base: { STR: 8, DEX: 14, CON: 13, INT: 15, WIS: 12, CHA: 10 },
    background: 'Foundry Worker', classSkills: ['Arcana', 'Perception'], attunement: 'UNATTUNED', reasonInFrostward: 'Delivering parts', linkToPc: 'Knows the Warden', ...patch,
  });
  it('accepts a legal character and derives the numbers', () => {
    expect(validateDraft(draft())).toEqual([]);
    const v = derive(draft());
    expect(v.proficiencyBonus).toBe(2);
    expect(v.scores).toEqual({ STR: 9, DEX: 15, CON: 14, INT: 16, WIS: 13, CHA: 11 }); // human: +1 to all
    expect(v.hp).toBe(8 + 5 + 5 + 3 * 2);
    expect(v.skills.sort()).toEqual(['Arcana', 'Athletics', 'Investigation', 'Perception']);
  });
  it('hit points use the fixed average', () => {
    expect(hpAtLevel(10, 2, 3)).toBe(10 + 6 + 6 + 6);
    expect(hpAtLevel(6, 0, 3)).toBe(6 + 4 + 4);
  });
  it('standard array must be used exactly once each', () => {
    expect(validateScores('ARRAY', { STR: 15, DEX: 15, CON: 13, INT: 12, WIS: 10, CHA: 8 })).toHaveLength(1);
  });
  it('point buy is 27 points, scores 8-15', () => {
    const s = { STR: 15, DEX: 15, CON: 15, INT: 8, WIS: 8, CHA: 8 };
    expect(pointBuyCost(s)).toBe(27);
    expect(validateScores('POINT_BUY', s)).toEqual([]);
    expect(validateScores('POINT_BUY', { ...s, INT: 9 })).toHaveLength(1);
    expect(validateScores('POINT_BUY', { ...s, STR: 16 })).toHaveLength(1);
  });
  it('any catalog species; variant human needs two different +1s', () => {
    expect(validateDraft(draft({ species: { entryId: 'not-a-species' } })).join(' ')).toMatch(/catalog/);
    expect(validateDraft(draft({ species: { entryId: 'phb-variant-human', asiPicks: ['INT'] } }))).toHaveLength(1);
    expect(derive(draft({ species: { entryId: 'phb-variant-human', asiPicks: ['INT', 'CON'] } })).scores).toMatchObject({ INT: 16, CON: 14, STR: 8 });
  });
  it('class skills: right count, from the class list, no duplicate of a background skill', () => {
    expect(validateDraft(draft({ classSkills: ['Arcana'] }))).toHaveLength(1);
    expect(validateDraft(draft({ classSkills: ['Arcana', 'Stealth'] }))).toHaveLength(1);
    expect(validateDraft(draft({ classSkills: ['Arcana', 'Investigation'] }))).toHaveLength(1);
  });
  it('a Resonant must be Attuned; nobody else gets a Patternbook', () => {
    expect(validateDraft(draft({ classId: 'resonant', classSkills: ['Arcana', 'History'] })).join(' ')).toMatch(/Attuned/);
    const r = derive(draft({ classId: 'resonant', classSkills: ['Arcana', 'History'], attunement: 'ECHO' }));
    expect(r).toMatchObject({ patternbookSize: 10, maxPatternLevel: 2 });
    expect(derive(draft({ attunement: 'ECHO' })).patternbookSize).toBe(0);
  });
  it('needs a reason to be in Frostward and a link to another PC', () => {
    expect(validateDraft(draft({ reasonInFrostward: '', linkToPc: '' }))).toHaveLength(2);
  });
});
