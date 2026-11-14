// Resonance Pattern directory (player-safe, PLAYTEST).
//
// WHAT IS VERIFIED, AND AGAINST WHAT (read this before trusting a row):
//  - SRD_VERIFIED: the 319 spells in the System Reference Document 5.1. Rules text and metadata
//    come from the SRD data (official, CC-BY-4.0) and were cross-checked against a second,
//    independent index. Disagreements are stored in `discrepancies`.
//  - CROSS_CHECKED: official 2014-era spells outside the SRD. Metadata only (level, school, casting
//    time, range, duration, component letters, which books print it), taken from ONE third-party
//    index (dnd5e.wikidot.com). NOT verified against any official book. No description is stored;
//    the card points to the book.
//  - ORIGINAL: 12 Solmourn Patterns written for this campaign.
//  - UNOFFICIAL: Unearthed Arcana playtest spells, listed and excluded.
// The mapping of spells to disciplines, and the exclusions, are WORKING proposals (Bible §5.3).
import srd from './spells.srd.json';
import index from './spells.index.json';
import { RP_COST } from './rules';
import { ORIGINAL_PATTERNS } from './spellsOriginal';
import type { Discipline, Pattern } from '../domain/types';

export { ORIGINAL_PATTERNS };
export const SRD_ATTRIBUTION =
  'This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License (https://creativecommons.org/licenses/by/4.0/legalcode).';

// ---------------- Source books ----------------
export interface SpellBook { code: string; title: string; scope: string }
export const SPELL_BOOKS: SpellBook[] = [
  { code: 'PHB', title: "Player's Handbook (2014)", scope: '2014' },
  { code: 'XGE', title: "Xanathar's Guide to Everything (2017)", scope: '2014' },
  { code: 'TCE', title: "Tasha's Cauldron of Everything (2020)", scope: '2014' },
  { code: 'EGW', title: "Explorer's Guide to Wildemount (2020)", scope: '2014' },
  { code: 'AI', title: 'Acquisitions Incorporated (2019)', scope: '2014' },
  { code: 'GGR', title: "Guildmasters' Guide to Ravnica (2018)", scope: '2014' },
  { code: 'IDRF', title: 'Icewind Dale: Rime of the Frostmaiden (2020)', scope: '2014' },
  { code: 'LLK', title: 'Lost Laboratory of Kwalish (2020)', scope: '2014' },
  { code: 'SCC', title: 'Strixhaven: A Curriculum of Chaos (2021)', scope: '2014' },
  { code: 'FTD', title: "Fizban's Treasury of Dragons (2021)", scope: '2014' },
  { code: 'AAG', title: "Spelljammer: Astral Adventurer's Guide (2022)", scope: '2014-compatible' },
  { code: 'PAM', title: 'Planescape: Adventures in the Multiverse (2023)', scope: '2014-compatible' },
  { code: 'BMT', title: 'The Book of Many Things (2023)', scope: '2014-compatible' },
  { code: 'EEPC', title: "Elemental Evil Player's Companion (2015)", scope: '2014 (listed only where the index credits it)' },
  { code: 'SCAG', title: "Sword Coast Adventurer's Guide (2015)", scope: '2014 (listed only where the index credits it)' },
  { code: 'SOLMOURN', title: 'Original Solmourn Pattern', scope: 'PLAYTEST' },
  { code: 'UA', title: 'Unearthed Arcana (playtest)', scope: 'not published; excluded' },
];
export const bookTitle = (code: string) => SPELL_BOOKS.find((b) => b.code === code)?.title ?? code;

export const VERIFICATION_LABEL: Record<NonNullable<Pattern['verification']>, string> = {
  SRD_VERIFIED: 'SRD verified',
  CROSS_CHECKED: 'Unverified: metadata from one third-party index',
  ORIGINAL: 'Original (playtest)',
  UNOFFICIAL: 'Unofficial playtest',
};

// ---------------- Discipline mapping (WORKING) ----------------
type D = Discipline;
const SCHOOL_DEFAULT: Record<string, D> = {
  Evocation: 'RADIANCE', Conjuration: 'FORM', Abjuration: 'KINESIS', Transmutation: 'FORM', Enchantment: 'VEIL', Necromancy: 'VITALITY', Divination: 'ECHO', Illusion: 'VEIL',
};
const SCHOOL_WHY: Record<string, string> = {
  Evocation: 'Evocation defaults to Radiance (light, heat, cold, electricity and raw energy).',
  Conjuration: 'Conjuration defaults to Form (shaping and bringing matter into being).',
  Abjuration: 'Abjuration defaults to Kinesis (barriers, holding things in place, pushing back).',
  Transmutation: 'Transmutation defaults to Form (changing the shape or properties of matter).',
  Enchantment: 'Enchantment defaults to Veil (perception, emotion and influence).',
  Necromancy: 'Necromancy defaults to Vitality (living bodies, life and death).',
  Divination: 'Divination defaults to Echo (information, signals and traces).',
  Illusion: 'Illusion defaults to Veil (perception and memory).',
};
const key = (n: string) => n.toLowerCase().replace(/[^a-z]+/g, '');
const names = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

const OVERRIDES: [D, string, string][] = [
  ['KINESIS', 'Acts through force, motion, distance, barriers or water and wind, which is Kinesis.', `Bigby's Hand, Mordenkainen's Sword, Blade Barrier, Earthquake, Eldritch Blast, Forcecage, Gust of Wind, Magic Missile, Otiluke's Resilient Sphere, Shatter, Spiritual Weapon,
    Thunderwave, Leomund's Tiny Hut, Wall of Force, Wind Wall, Dimension Door, Tenser's Floating Disk, Drawmij's Instant Summons, Mage Hand, Misty Step, Teleport, Teleportation Circle, Unseen Servant,
    Word of Recall, Control Water, Expeditious Retreat, Feather Fall, Fly, Haste, Jump, Knock, Levitate, Longstrider, Reverse Gravity, Slow, Spider Climb, Telekinesis, Water Walk, Wind Walk,
    Animate Objects, Arcane Gate, Cloud of Daggers, Conjure Barrage, Conjure Volley, Cordon of Arrows, Destructive Wave, Swift Quiver, Thunderous Smite, Tsunami, Far Step, Thunder Step, Vortex Warp,
    Tidal Wave, Watery Sphere, Dust Devil, Sword Burst, Steel Wind Strike, Scatter, Blade of Disaster, Ashardalon's Stride, Kinetic Jaunt, Catapult, Magnify Gravity, Zephyr Strike, Earthbind,
    Immovable Object, Control Winds, Temporal Shunt, Erupting Earth, Earth Tremor, Warding Wind, Pulse Wave, Gravity Sinkhole, Gravity Fissure, Maelstrom, Whirlwind, Ravenous Void, Thunderclap,
    Booming Blade, Jim's Magic Missile, Gust, Shape Water, Wall of Water, Spray of Cards`],
  ['RADIANCE', 'Produces or controls light, heat, cold, electricity or energy, which is Radiance.', `Call Lightning, Flaming Sphere, Incendiary Cloud, Produce Flame, Storm of Vengeance, Sleet Storm,
    Prismatic Wall, Protection from Energy, Control Weather, Heat Metal, Armor of Agathys, Elemental Weapon, Lightning Arrow, Create Bonfire, Frostbite, Ice Knife, Green-Flame Blade, Lightning Lure,
    Word of Radiance, Absorb Elements, Frost Fingers, Searing Smite, Blinding Smite, Witch Bolt, Aganazzar's Scorcher, Snilloc's Snowball Swarm, Melf's Minute Meteors, Sickening Radiance, Storm Sphere,
    Dawn, Immolation, Wall of Light, Crown of Stars, Control Flames, Dragon's Breath, Pyrotechnics, Flame Arrows, Elemental Bane, Investiture of Flame, Investiture of Ice, Primordial Ward, Dark Star`],
  ['VITALITY', 'Works on bodies, health, plants and animals, which is Vitality.', `Cure Wounds, Heal, Healing Word, Mass Healing Word, Prayer of Healing, Mass Cure Wounds, Mass Heal, Poison Spray,
    Revivify, Cloudkill, Stinking Cloud, Entangle, Wall of Thorns, Aid, Antilife Shell, Death Ward, Greater Restoration, Lesser Restoration, Protection from Poison, Warding Bond, Animal Shapes, Barkskin,
    Darkvision, Enhance Ability, Giant Insect, Goodberry, Plant Growth, Polymorph, Purify Food and Drink, Regenerate, Shapechange, Spike Growth, True Polymorph, Water Breathing, Ensnaring Strike,
    Grasping Vine, Hail of Thorns, Thorn Whip, Aura of Life, Aura of Purity, Aura of Vitality, Power Word: Heal, Healing Spirit, Primal Savagery, Draconic Transformation, Guardian of Nature,
    Skill Empowerment, Tenser's Transformation, Mass Polymorph, Wrath of Nature, Druid Grove`],
  ['VEIL', 'Acts on minds, fear or being noticed, which is Veil.', `Beacon of Hope, Guards and Wards, Mind Blank, Pass without Trace, Sanctuary, Glibness, Sequester, Thaumaturgy, Eyebite,
    Wrathful Smite, Staggering Smite, Intellect Fortress, Cause Fear, Maddening Darkness, Silvery Barbs`],
  ['FORM', 'Shapes, reinforces or dissolves matter, which is Form.', `Melf's Acid Arrow, Wall of Stone, Arcane Lock, Stoneskin, Creation, Tasha's Caustic Brew, Vitriolic Sphere,
    Maximillian's Earthen Grasp, Transmute Rock, Bones of the Earth, Investiture of Stone, Snare, Shadow Blade, Galder's Tower, Mighty Fortress, Create Magen, Create Homunculus, Wall of Sand, Air Bubble`],
  ['ECHO', 'Carries, stores, reads or guards information and signals, which is Echo.', `Contingency, Sending, Alarm, Antimagic Field, Counterspell, Dispel Magic, Glyph of Warding, Nondetection,
    Mordenkainen's Private Sanctum, Symbol, Message, Speak with Plants, Animal Messenger, Silence, Magic Mouth, Nystul's Magic Aura, Skywrite, Galder's Speedy Courier, Encode Thoughts`],
];
const EXCLUSIONS: [string, string][] = [
  ['Summons, binds or relies on otherworldly creatures; none exist in this setting.', `Conjure Animals, Conjure Celestial, Conjure Elemental, Conjure Fey, Conjure Minor Elementals, Conjure Woodland Beings,
    Mordenkainen's Faithful Hound, Find Familiar, Find Steed, Find Greater Steed, Guardian of Faith, Insect Plague, Planar Ally, Planar Binding, Evard's Black Tentacles, Phantom Steed, Simulacrum, Awaken,
    Arms of Hadar, Hunger of Hadar, Summon Beast, Summon Fey, Summon Shadowspawn, Summon Lesser Demons, Summon Aberration, Summon Construct, Summon Elemental, Summon Greater Demon, Summon Celestial,
    Summon Fiend, Summon Undead, Summon Draconic Spirit, Infernal Calling, Flock of Familiars`],
  ['Other planes and extradimensional spaces are not part of this setting.', `Banishment, Demiplane, Gate, Mordenkainen's Magnificent Mansion, Maze, Plane Shift, Leomund's Secret Chest, Etherealness,
    Blink, Rope Trick, Astral Projection, Contact Other Plane, Transport via Plants, Tree Stride, Banishing Smite, Wristpocket, Gate Seal, Warp Sense, Dream of the Blue Veil, Create Spelljamming Helm,
    Tasha's Otherworldly Guise`],
  ['Divine power: there are no gods or divine magic here.', `Divine Favor, Divine Word, Hallow, Holy Aura, Forbiddance, Dispel Evil and Good, Magic Circle, Protection from Evil and Good, Detect Evil and Good,
    Augury, Commune, Commune with Nature, Divination, Heroes' Feast, Crusader's Mantle, Circle of Power, Ceremony, Holy Weapon, Temple of the Gods`],
  ['Undead, souls and unrestricted resurrection are outside Vitality.', `Animate Dead, Create Undead, Speak with Dead, Magic Jar, Raise Dead, Resurrection, True Resurrection, Reincarnate, Clone,
    Danse Macabre, Negative Energy Flood, Soul Cage`],
  ['Curses, wishes and stopped time have no Resonance mechanism.', 'Remove Curse, Bestow Curse, Imprisonment, Wish, Time Stop, Hex'],
];
// Hand-written notes for mappings that are a judgement call. Anything overridden away from its school default is also flagged ambiguous.
const NOTES: Record<string, string> = {
  'Dark Star': 'Darkness is the absence of light, so it sits with Radiance; Kinesis (the gravity theme) is the alternative.',
  'Maddening Darkness': 'It is darkness that drives creatures mad: Veil for the madness, Radiance for the darkness. Mapped to Veil.',
  'Wrath of Nature': 'Animates plants and terrain against enemies: Vitality, not Radiance, despite being evocation.',
  'Shadow Blade': 'A solid weapon formed from shadow: shaped matter, so Form rather than Veil.',
  'Create Homunculus': 'Builds a small servant creature. Kept as Form (synthetic personhood is supported); the DM may prefer to exclude it.',
  'Create Magen': 'Builds a construct. Kept as Form; the DM decides whether the setting\'s constructs allow it.',
  'Temporal Shunt': 'Printed as a time-themed reaction. Kinesis does not rewrite time, so it is mapped as a displacement effect only; the DM should read it closely.',
  'Skywrite': 'Writes words in the sky: a signal, so Echo.',
  'Silvery Barbs': 'Forces a reroll and grants advantage: probability and attention, mapped to Veil. Echo is the alternative.',
  'Cause Fear': 'Fear is Veil even though it is printed as necromancy.',
  'Gift of Alacrity': 'Improves initiative by sharpening anticipation: left as Echo (divination default).',
  "Fortune's Favor": 'Luck and probability as information: left as Echo (divination default).',
  'Spirit Shroud': 'Draws spirits, which have no setting meaning here. Left as Vitality (necromancy default); the DM may reflavor.',
  'Spirit of Death': 'Name suggests spirits of the dead. Left as Vitality (necromancy default); the DM should read it before approving.',
  'Time Ravage': 'Ages a target rapidly: Vitality (bodies), not a time effect.',
  'Beast Bond': 'A shared awareness with an animal: left as Echo (divination default).',
  'Reality Break': 'Printed as conjuration with an otherworldly theme. Left as Form; the DM should read it before approving.',
  'Infestation': 'Conjures pests: left as Form (conjuration default); the DM may prefer Vitality.',
  'Absorb Elements': 'Takes in energy damage and reuses it: energy transfer is Radiance, though printed as abjuration.',
  'Chaos Bolt': 'Random energy: Radiance (evocation default).',
  'Galder\'s Speedy Courier': 'Delivers a message or item through a courier: mapped to Echo as a carried signal.',
  'Encode Thoughts': 'Turns thoughts into a physical record: information, so Echo.',
  'Spray of Cards': 'Hurls conjured cards: mapped to Kinesis as a thrown force effect.',
};

const OVERRIDE_MAP = new Map<string, { d: D; why: string }>();
for (const [d, why, list] of OVERRIDES) for (const n of names(list)) OVERRIDE_MAP.set(key(n), { d, why });
const EXCLUDE_MAP = new Map<string, string>();
for (const [why, list] of EXCLUSIONS) for (const n of names(list)) EXCLUDE_MAP.set(key(n), why);
/** Mapping names that matched no spell: must stay empty (checked by a test). */
export const UNMATCHED_MAPPING_NAMES: string[] = [];

// Renames where the published name clashes with the setting (original names, not book text).
const RENAME: Record<string, string> = {
  'Sacred Flame': 'Searing Flare', 'Spiritual Weapon': 'Force Weapon', 'Shield of Faith': 'Deflection Field', 'Flame Strike': 'Column of Flame', 'Guiding Bolt': 'Marking Bolt',
  'Hellish Rebuke': 'Scorching Rebuke', 'Eldritch Blast': 'Force Lance', Thaumaturgy: 'Presence Trick', Bless: 'Steadying Cadence', Bane: 'Unsettling Cadence', 'Prayer of Healing': 'Group Mending',
  'Beacon of Hope': 'Rallying Calm', Sanctuary: 'Overlooked', 'Death Ward': 'Failsafe Pulse', 'Dissonant Whispers': 'Intrusive Whispers', 'Faerie Fire': 'Outline Glow', Druidcraft: 'Small Workings',
  Shillelagh: 'Hardened Haft', Moonbeam: 'Cold Beam', 'Legend Lore': 'Deep Trace',
};

const EXPRESSION: Record<Discipline, string> = {
  RADIANCE: 'Channelled through an Anchor as light, heat, cold or current; nearby thermal gauges and lamps flicker with it.',
  KINESIS: 'A shaped push of force or motion; dust, frost and loose parts trace its path.',
  VITALITY: 'Worked on living tissue; it reads on medical scanners and leaves the subject warm or drained.',
  VEIL: 'Acts on perception, feeling or memory; it leaves no physical trace, which is why it is the most restricted.',
  FORM: 'Reshapes or reinforces matter; treated material shows fine, regular grain lines.',
  ECHO: 'Reads or carries signals and residual traces; it can register on listening equipment.',
};
export const expressionFor = (d: Discipline) => EXPRESSION[d];

// ---------------- Build ----------------
interface SrdRec { i: string; n: string; l: number; s: string; t: string; r: string; c: boolean; ri: boolean; d: string; co: string; m: string; x: string; h: string }
interface IndexRow { k: string; n: string; l: number; sc: string; t: string; r: string; d: string; c: boolean; ri: boolean; co: string; bk: string[]; srd: string | null; ua: boolean; uaVariant: boolean; tg: string[]; df: string[] }
const SRD_BY_ID = new Map((srd as SrdRec[]).map((s) => [s.i, s]));
const kebab = (n: string) => n.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const usedKeys = new Set<string>();

function build(row: IndexRow): Pattern {
  const sr = row.srd ? SRD_BY_ID.get(row.srd) : undefined;
  const k = key(row.n);
  const ov = OVERRIDE_MAP.get(k);
  const exclusion = EXCLUDE_MAP.get(k);
  if (ov || exclusion) usedKeys.add(k);
  const schoolDefault = SCHOOL_DEFAULT[row.sc] ?? 'ECHO';
  const discipline: D = ov?.d ?? schoolDefault;
  const note = NOTES[row.n];
  const isUa = row.ua;
  const reason = isUa ? 'Unearthed Arcana playtest material, not a published final spell.' : exclusion;
  const ambiguous = !reason && !!note;
  const mappingNote = note ?? (ov ? `${ov.why}${ov.d !== schoolDefault ? ` (Overrides the school default: ${SCHOOL_WHY[row.sc]})` : ''}` : SCHOOL_WHY[row.sc]);
  const primary = row.bk.includes('PHB') ? 'PHB' : row.bk[0];
  const verification: Pattern['verification'] = isUa ? 'UNOFFICIAL' : sr ? 'SRD_VERIFIED' : 'CROSS_CHECKED';
  const name = RENAME[row.n] ?? row.n;
  const sourceLine = isUa ? 'Unearthed Arcana playtest: not published.' : sr
    ? `SRD 5.1 text (CC-BY-4.0). Printed in: ${row.bk.map(bookTitle).join('; ')}.`
    : `Printed in: ${row.bk.map(bookTitle).join('; ')}. Rules text is not included: see the book. Metadata is UNVERIFIED (one third-party index).`;
  return {
    id: `spell:${kebab(sr ? sr.n : row.n)}`,
    name, publishedName: name === row.n ? undefined : row.n,
    discipline, level: row.l, rpCost: RP_COST[row.l], school: row.sc,
    action: row.t, range: row.r, duration: row.d, concentration: row.c, ritual: row.ri,
    components: sr?.m ? `${row.co} (${sr.m.replace(/\.$/, '')})` : row.co,
    origin: isUa ? 'UA' : sr ? 'SRD' : primary === 'PHB' ? 'PHB' : 'SUPPLEMENT',
    status: reason ? 'EXCLUDED' : 'MAPPED', excludedReason: reason,
    sources: row.bk.length ? row.bk : isUa ? ['UA'] : [], verification, discrepancies: row.df.length ? row.df : undefined,
    mappingNote, ambiguous: ambiguous || undefined, tags: row.tg.length ? row.tg : undefined, visibility: 'PLAYER_SAFE',
    source: sourceLine, licensedTextAvailable: !!sr, rulesMd: sr?.x, upcastMd: sr?.h || undefined,
  };
}

const INDEX = (index as { rows: IndexRow[] }).rows;
export const SPELL_INDEX_META = { indexSource: (index as { indexSource: string }).indexSource, fetchedAt: (index as { fetchedAt: string }).fetchedAt };
const PUBLISHED: Pattern[] = INDEX.map(build);
for (const k of [...OVERRIDE_MAP.keys(), ...EXCLUDE_MAP.keys()]) if (!usedKeys.has(k)) UNMATCHED_MAPPING_NAMES.push(k);

/** Every row of the directory, including exclusions (nothing is silently dropped). */
export const SPELLS: Pattern[] = [...PUBLISHED, ...ORIGINAL_PATTERNS].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
/** Patterns a Resonant can actually take. */
export const PATTERNS: Pattern[] = SPELLS.filter((p) => p.status === 'MAPPED');

// ---------------- Stable ids ----------------
const BY_ID = new Map(SPELLS.map((p) => [p.id, p]));
/** Old ids looked like "radiance:fire-bolt" (discipline-prefixed). The id is now discipline-independent, so remapping a spell never orphans a character's selection. */
export function normalizePatternId(id: string): string {
  if (BY_ID.has(id)) return id;
  const suffix = id.includes(':') ? id.split(':').slice(1).join(':') : id;
  const next = `spell:${suffix}`;
  return BY_ID.has(next) ? next : id;
}
export const patternById = (id: string) => BY_ID.get(normalizePatternId(id));
export const isKnownPatternId = (id: string) => BY_ID.has(normalizePatternId(id));

/** Player-facing view: DM-only Patterns and unpublished playtest (Unearthed Arcana) spells never appear in player browsing or search. */
export const playerVisible = (list: Pattern[] = SPELLS) => list.filter((p) => (p.visibility ?? 'PLAYER_SAFE') === 'PLAYER_SAFE' && p.verification !== 'UNOFFICIAL');

// ---------------- Coverage ----------------
export interface Coverage { source: string; code: string; level: number; total: number; mapped: number; excluded: number; verified: number; unverified: number }
/** Counts per source book and level. A spell printed in two books counts in both rows (so the rows add up to more than the number of unique spells). */
export function coverageReport(): Coverage[] {
  const out: Coverage[] = [];
  for (const b of SPELL_BOOKS) {
    for (let level = 0; level <= 9; level++) {
      const rows = SPELLS.filter((s) => s.sources?.includes(b.code) && s.level === level);
      if (!rows.length) continue;
      out.push({
        source: b.title, code: b.code, level, total: rows.length, mapped: rows.filter((r) => r.status === 'MAPPED').length, excluded: rows.filter((r) => r.status === 'EXCLUDED').length,
        verified: rows.filter((r) => r.verification === 'SRD_VERIFIED' || r.verification === 'ORIGINAL').length, unverified: rows.filter((r) => r.verification === 'CROSS_CHECKED').length,
      });
    }
  }
  return out;
}
export interface BookSummary { code: string; title: string; scope: string; total: number; verified: number; unverified: number; mapped: number; excluded: number }
export function bookSummaries(): BookSummary[] {
  return SPELL_BOOKS.map((b) => {
    const rows = SPELLS.filter((s) => s.sources?.includes(b.code));
    return {
      code: b.code, title: b.title, scope: b.scope, total: rows.length, verified: rows.filter((r) => r.verification === 'SRD_VERIFIED' || r.verification === 'ORIGINAL').length,
      unverified: rows.filter((r) => r.verification === 'CROSS_CHECKED').length, mapped: rows.filter((r) => r.status === 'MAPPED').length, excluded: rows.filter((r) => r.status === 'EXCLUDED').length,
    };
  }).filter((s) => s.total > 0);
}
export const spellTotals = () => ({
  rows: SPELLS.length, unique: SPELLS.length, official: SPELLS.filter((s) => s.origin !== 'ORIGINAL' && s.origin !== 'UA').length, srd: SPELLS.filter((s) => s.verification === 'SRD_VERIFIED').length,
  unverified: SPELLS.filter((s) => s.verification === 'CROSS_CHECKED').length, original: ORIGINAL_PATTERNS.length, unofficial: SPELLS.filter((s) => s.verification === 'UNOFFICIAL').length,
  mapped: PATTERNS.length, excluded: SPELLS.filter((s) => s.status === 'EXCLUDED').length, ambiguous: SPELLS.filter((s) => s.ambiguous).length, discrepancies: SPELLS.filter((s) => s.discrepancies?.length).length,
});
