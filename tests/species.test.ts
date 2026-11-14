// Canon Amendment 001 (the Divergence): species catalog, builder rules, innate features vs
// Resonance, and spoiler safety of everything players see about species.
import { describe, expect, it } from 'vitest';
import { SPECIES, speciesById, speciesCoverage } from '../src/content/species';
import { CLASSES } from '../src/content/classes';
import { BACKGROUNDS, DISTRICTS } from '../src/content/rules';
import { blankPc } from '../src/data/blank';
import { derive, validateDraft, type Draft } from '../src/domain/creation';
import { runStructuralChecks } from '../src/domain/canon';
import { applyCast, applyRest, calcCast, castInputFor, getRes, syncResources, useFeature } from '../src/domain/rules';
import { blankManual, innateFeatures, physiology, speciesAsi, speciesSelectionOf, validateSpecies, type SpeciesSelection } from '../src/domain/species';
import { buildCharacterSheet, buildPlayerRecap, safeProjection, scanSpoilers, type CampaignData } from '../src/domain/safe';
import { buildSafeIndex, search } from '../src/domain/search';
import { buildCharacterGuideMd } from '../src/content/charGuide';
import { freshData } from './fixtures/seedV2';
import type { PC } from '../src/domain/types';

const pc = (patch: Partial<PC>): PC => {
  const p = { ...blankPc(), id: 'pc-t', campaignId: 'solmourn', createdAt: '', updatedAt: '', revision: 1, ...patch } as PC;
  return { ...p, resources: syncResources({ ...p, resources: [] }) };
};
const draft = (species: SpeciesSelection, patch: Partial<Draft> = {}): Draft => ({
  name: 'Ash', species, classId: 'warden', method: 'ARRAY', base: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
  background: 'Frostward Survivor', classSkills: ['Athletics', 'Perception'], attunement: 'UNATTUNED', reasonInFrostward: 'On shift', linkToPc: 'Cousin of the Shade', ...patch,
});
const manual = (patch: Partial<ReturnType<typeof blankManual>> = {}) => ({ ...blankManual(), bookRef: 'Spelljammer: Adventures in Space, p. 15', ...patch });

describe('catalog and coverage', () => {
  it('ships the nine SRD species with licensed, automated rules', () => {
    const impl = SPECIES.filter((s) => s.status === 'IMPLEMENTED');
    expect(impl.map((s) => s.name)).toEqual(['Human', 'Variant Human', 'Dragonborn', 'Dwarf (Hill)', 'Elf (High)', 'Gnome (Rock)', 'Half-Elf', 'Half-Orc', 'Halfling (Lightfoot)', 'Tiefling']);
    expect(impl.filter((s) => s.sourceCode === 'SRD').every((s) => s.verified && s.license.startsWith('CC-BY'))).toBe(true);
  });
  it('never claims verification it does not have', () => {
    for (const s of SPECIES.filter((x) => x.sourceCode !== 'SRD')) expect(s.verified, s.id).toBe(false);
    for (const s of SPECIES.filter((x) => x.status === 'SOURCE_NEEDED')) {
      expect(s.asi, s.id).toBeUndefined();
      expect(s.innate, s.id).toBeUndefined();
    }
    const c = speciesCoverage();
    expect(c.implemented).toBe(10);
    expect(c.sourceNeeded).toBeGreaterThan(70);
    expect(c.notSupported).toBe(10);
  });
  it('every entry has a unique id and a distinct label within its family (versions never merge)', () => {
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(SPECIES.length);
    const labels = SPECIES.map((s) => `${s.family}|${s.name}|${s.sourceCode}|${s.edition}`);
    expect(new Set(labels).size).toBe(SPECIES.length);
    const tieflings = SPECIES.filter((s) => s.family === 'tiefling').map((s) => `${s.sourceCode}-${s.edition}`);
    expect(tieflings).toEqual(['SRD-2014', 'PHB24-2024']);
  });
  it('includes the species named in the acceptance list', () => {
    for (const id of ['srd-human', 'srd-high-elf', 'srd-dragonborn', 'srd-tiefling', 'erlw-warforged', 'sja-autognome', 'sja-plasmoid', 'other-official']) expect(speciesById(id), id).toBeTruthy();
  });
});

describe('builder: one species package, 2014 rules', () => {
  it('human, elf, dragonborn and tiefling build legal level-3 characters', () => {
    const cases: [SpeciesSelection, Record<string, number>][] = [
      [{ entryId: 'srd-human' }, { STR: 16, DEX: 15, CON: 14, INT: 13, WIS: 11, CHA: 9 }],
      [{ entryId: 'srd-high-elf', choiceId: 'light' }, { DEX: 16, INT: 13 }],
      [{ entryId: 'srd-dragonborn', choiceId: 'silver' }, { STR: 17, CHA: 9 }],
      [{ entryId: 'srd-tiefling' }, { INT: 13, CHA: 10 }],
    ];
    for (const [sp, expected] of cases) {
      expect(validateDraft(draft(sp)), sp.entryId).toEqual([]);
      expect(derive(draft(sp)).scores, sp.entryId).toMatchObject(expected);
    }
  });
  it('applies species bonuses exactly once', () => {
    const v = derive(draft({ entryId: 'srd-half-elf', asiPicks: ['STR', 'CON'] }));
    expect(v.scores).toEqual({ STR: 16, DEX: 14, CON: 14, INT: 12, WIS: 10, CHA: 10 });
  });
  it('half-elf and variant human need valid picks', () => {
    expect(validateSpecies({ entryId: 'srd-half-elf', asiPicks: ['STR'] })).toHaveLength(1);
    expect(validateSpecies({ entryId: 'srd-half-elf', asiPicks: ['CHA', 'STR'] })).toHaveLength(1); // CHA is already +2
    expect(validateSpecies({ entryId: 'phb-variant-human', asiPicks: ['INT', 'CON'] })).toEqual([]);
  });
  it('2024 revisions cannot be chosen, so 2014 and 2024 bonuses never stack', () => {
    expect(validateSpecies({ entryId: 'phb24-tiefling' }).join(' ')).toMatch(/2024/);
    const p = pc({ species: { entryId: 'phb24-elf' }, ancestry: 'Elf' });
    expect(runStructuralChecks([], [p]).map((f) => f.ruleId)).toEqual(['pc-species-2024']);
  });
  it('mixed heritage never stacks two trait packages', () => {
    expect(validateSpecies({ entryId: 'srd-human', extraEntryIds: ['srd-high-elf'] }).join(' ')).toMatch(/one species rules package/i);
    expect(validateSpecies({ entryId: 'srd-human', heritageNote: 'Elf grandmother' })).toEqual([]);
  });
  it('dragonborn and high elf must make their choice', () => {
    expect(validateSpecies({ entryId: 'srd-dragonborn' })).toHaveLength(1);
    expect(validateSpecies({ entryId: 'srd-high-elf' })).toHaveLength(1);
  });
  it('book species: traits entered from the book, with page, within 2014 limits', () => {
    expect(validateSpecies({ entryId: 'sja-plasmoid' }).join(' ')).toMatch(/enter the traits/);
    expect(validateSpecies({ entryId: 'sja-plasmoid', manual: manual({ bookRef: '' }) }).join(' ')).toMatch(/book and page/);
    expect(validateSpecies({ entryId: 'sja-plasmoid', manual: manual({ asi: { CON: 2, STR: 2 } }) }).join(' ')).toMatch(/total \+3/);
    expect(validateSpecies({ entryId: 'sja-plasmoid', manual: manual({ asi: { CON: 2, WIS: 1 } }) })).toEqual([]);
    expect(speciesAsi({ entryId: 'sja-plasmoid', manual: manual({ asi: { CON: 2, WIS: 1 } }) })).toEqual({ CON: 2, WIS: 1 });
  });
  it('book species start unapproved and are flagged for DM review', () => {
    const p = pc({ ancestry: 'Warforged', species: { entryId: 'erlw-warforged', manual: manual({ bookRef: 'ERLW p. 35', asi: { CON: 2 } }) } });
    expect(runStructuralChecks([], [p]).map((f) => f.ruleId)).toEqual(['pc-species-review']);
    expect(runStructuralChecks([], [{ ...p, species: { ...p.species!, dmApproved: true } }])).toEqual([]);
  });
  it('every species works with all six classes and every district', () => {
    const selectable = SPECIES.filter((s) => s.status === 'IMPLEMENTED');
    for (const s of selectable) {
      const sel: SpeciesSelection = { entryId: s.id, choiceId: s.choice?.options[0].id, asiPicks: s.asiChoice ? s.asiChoice.from.filter((a) => !(s.asi ?? {})[a]).slice(0, s.asiChoice.choose) : undefined };
      for (const c of CLASSES) {
        const skills = c.skillChoices!.from.filter((x) => !['Survival', 'Stealth'].includes(x)).slice(0, c.skillChoices!.count);
        const errs = validateDraft(draft(sel, { classId: c.id, classSkills: skills, attunement: c.id === 'resonant' ? 'ECHO' : 'UNATTUNED' }));
        expect(errs, `${s.id} ${c.id}`).toEqual([]);
      }
    }
    // Species never filters background or district.
    expect(BACKGROUNDS.length).toBe(5);
    expect(DISTRICTS.length).toBe(6);
    const sn = { entryId: 'sja-thri-kreen', manual: manual({ asi: { DEX: 2, WIS: 1 } }) };
    for (const c of CLASSES) expect(validateSpecies(sn), c.id).toEqual([]);
  });
  it('hill dwarf toughness adds 1 HP per level', () => {
    expect(derive(draft({ entryId: 'srd-hill-dwarf' })).hp - derive(draft({ entryId: 'srd-human' })).hp).toBe(3);
  });
});

describe('senses, movement and anatomy follow the selected rules', () => {
  it('SRD speeds, size and darkvision', () => {
    expect(physiology({ entryId: 'srd-human' })).toMatchObject({ size: 'Medium', speed: 30, darkvision: 0 });
    expect(physiology({ entryId: 'srd-lightfoot-halfling' })).toMatchObject({ size: 'Small', speed: 25, darkvision: 0 });
    expect(physiology({ entryId: 'srd-tiefling' })).toMatchObject({ darkvision: 60, resistances: ['fire'] });
    expect(physiology({ entryId: 'srd-dragonborn', choiceId: 'silver' }).resistances).toEqual(['cold']);
  });
  it('flight, swimming, climbing, darkvision and natural armor from the book', () => {
    const b = physiology({ entryId: 'mpmm-aarakocra', manual: manual({ fly: 30, speed: 30, darkvision: 0 }) });
    expect(b).toMatchObject({ fly: 30, speed: 30 });
    expect(physiology({ entryId: 'vgm-triton', manual: manual({ swim: 30, darkvision: 60 }) })).toMatchObject({ swim: 30, darkvision: 60 });
    expect(physiology({ entryId: 'mpmm-tortle', manual: manual({ naturalArmor: 'Natural Armor: AC 17' }) }).naturalArmor).toBe('Natural Armor: AC 17');
    expect(validateSpecies({ entryId: 'mpmm-aarakocra', manual: manual({ fly: 500 }) }).join(' ')).toMatch(/fly/);
  });
  it('the character sheet export shows species movement and senses', () => {
    const p = pc({ name: 'Kiri', ancestry: 'Aarakocra', species: { entryId: 'mpmm-aarakocra', dmApproved: true, manual: manual({ fly: 30 }) } });
    expect(buildCharacterSheet(p)).toMatch(/Aarakocra .* fly 30 ft/);
  });
});

describe('innate features are bounded and never touch Resonance', () => {
  it('dragonborn breath weapon: short-rest resource that scales with level', () => {
    const p = pc({ species: { entryId: 'srd-dragonborn', choiceId: 'red' }, ancestry: 'Dragonborn' });
    expect(getRes(p, 'species:breath-weapon')).toMatchObject({ max: 1, recovery: 'SHORT_REST' });
    expect(innateFeatures(p.species!, 3)[0].note).toMatch(/2d6 fire, 15 ft cone/);
    expect(innateFeatures(p.species!, 11)[0].note).toMatch(/^4d6/);
    const used = useFeature(p, 'species:breath-weapon');
    if (!used.ok) throw new Error(used.error);
    expect(getRes(applyRest(used.value, 'SHORT'), 'species:breath-weapon')?.current).toBe(1);
  });
  it('tiefling innate spells follow printed levels and uses', () => {
    expect(innateFeatures({ entryId: 'srd-tiefling' }, 1).map((f) => f.id)).toEqual(['thaumaturgy']);
    expect(innateFeatures({ entryId: 'srd-tiefling' }, 3).map((f) => f.id)).toEqual(['thaumaturgy', 'hellish-rebuke']);
    expect(innateFeatures({ entryId: 'srd-tiefling' }, 5).map((f) => f.id)).toEqual(['thaumaturgy', 'hellish-rebuke', 'darkness']);
  });
  it('species features grant no RP, Amplification, Emergency or Patterns', () => {
    const warden = pc({ species: { entryId: 'srd-tiefling' }, ancestry: 'Tiefling' });
    expect(warden.resources.map((r) => r.key).sort()).toEqual(['species:hellish-rebuke', 'warden:action-surge', 'warden:second-wind']);
    const resonant = pc({ classId: 'resonant', attunement: 'RADIANCE', species: { entryId: 'srd-tiefling' }, ancestry: 'Tiefling' });
    const human = pc({ classId: 'resonant', attunement: 'RADIANCE' });
    expect(getRes(resonant, 'rp')).toEqual(getRes(human, 'rp'));
    expect(getRes(resonant, 'amp')).toEqual(getRes(human, 'amp'));
    expect(resonant.patternIds).toEqual([]);
    // Spending a species feature leaves RP untouched; casting leaves species features untouched.
    const spent = useFeature(resonant, 'species:hellish-rebuke');
    if (!spent.ok) throw new Error(spent.error);
    expect(getRes(spent.value, 'rp')?.current).toBe(14);
    const cast = applyCast(resonant, calcCast(castInputFor(resonant, 2, { ampTier: 1 })));
    if (!cast.ok) throw new Error(cast.error);
    expect(getRes(cast.value, 'species:hellish-rebuke')?.current).toBe(1);
  });
  it('a hand-entered innate feature is a species resource, never RP', () => {
    const p = pc({ ancestry: 'Aasimar', species: { entryId: 'mpmm-aasimar', manual: manual({ innate: [{ id: 'manual-1', name: 'Healing Hands', uses: 1, recovery: 'LONG_REST', minLevel: 1, action: 'Action', note: '' }] }) } });
    expect(p.resources.map((r) => r.key).sort()).toEqual(['species:manual-1', 'warden:action-surge', 'warden:second-wind']);
    expect(getRes(p, 'rp')).toBeUndefined();
  });
});

describe('old human PCs stay valid', () => {
  it('a pre-amendment PC with no species field reads as human and passes checks', () => {
    const old = { ...pc({}), species: undefined, ancestry: 'Human' } as PC;
    expect(speciesSelectionOf(old)).toEqual({ entryId: 'srd-human' });
    expect(runStructuralChecks([], [old])).toEqual([]);
    expect(speciesSelectionOf({ ...old, ancestry: 'Variant Human' }).entryId).toBe('phb-variant-human');
    expect(syncResources(old).map((r) => r.key)).toEqual(old.resources.map((r) => r.key));
  });
});

describe('species content is spoiler-safe', () => {
  const SECRETS = ['New York', 'Manhattan', 'Ember', 'Concordance', 'Unbound', 'Dissonance', 'Vesperdeep', 'Sundering', 'Old Relay', 'Cinder'];
  it('the catalog, the guide and the player species doc contain no campaign secrets', () => {
    const d = freshData() as unknown as CampaignData;
    const texts = [JSON.stringify(SPECIES), buildCharacterGuideMd(), (d.docs.find((x) => x.id === 'doc-player-species')!).bodyMd];
    for (const t of texts) for (const s of SECRETS) expect(t, s).not.toContain(s);
    for (const t of texts) expect(scanSpoilers(t, d.revelations)).toEqual([]);
  });
  it('the DM-only amendment never reaches a player surface', () => {
    const d = freshData() as unknown as CampaignData;
    const safe = JSON.stringify(safeProjection(d)) + JSON.stringify(buildSafeIndex(d)) + d.sessions.map((s) => buildPlayerRecap(d, s.id)).join('');
    expect(safe).not.toContain('Canon Amendment 001');
    expect(safe).not.toContain('nine original Concordances');
    expect(d.docs.find((x) => x.id === 'doc-amendment-001')!.visibility).toBe('DM_ONLY');
    expect(safeProjection(d).some((c) => c.id === 'lore-p-divergence')).toBe(true);
    expect(search(buildSafeIndex(d), 'plasmoid').length).toBeGreaterThan(0);
    expect(search(buildSafeIndex(d), 'origin family bioengineered').every((h) => !/WORKING origin/.test(h.text))).toBe(true);
  });
  it('choosing any species reveals nothing: every entry name and source is clean', () => {
    for (const s of SPECIES) for (const w of SECRETS) expect(`${s.name} ${s.sourceTitle} ${s.license}`, s.id).not.toContain(w);
  });
});
