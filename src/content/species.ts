// Playable species registry (Canon Amendment 001: the Divergence).
//
// Three tiers, so coverage is never overstated:
//  - IMPLEMENTED: SRD 5.1 species with licensed rules text and automated mechanics
//    (CC-BY-4.0), plus the PHB 2014 variant human the app already supported.
//  - SOURCE_NEEDED: other official 2014-era species. Listed from memory and NOT verified by the
//    app: the DM confirms book + page, then enters the traits from the book by hand. No
//    protected rulebook text is stored.
//  - NOT_SUPPORTED: 2024 revisions. The campaign baseline is 2014; adopting 2024 species is an
//    OPEN DM decision, and 2024 species ability scores come from backgrounds, which would
//    double-apply with the 2014 system.
// The Solmourn origin notes are WORKING (amendment §3, §6) and DM-only.
import srd from './species.srd.json';
import type { Ability } from '../domain/types';

export type SpeciesStatus = 'IMPLEMENTED' | 'SOURCE_NEEDED' | 'NOT_SUPPORTED';
export type Size = 'Tiny' | 'Small' | 'Medium';
export interface InnateFeature {
  id: string;
  name: string;
  /** Uses per recovery; 0 = at will. */
  uses: number;
  recovery: 'SHORT_REST' | 'LONG_REST' | 'NONE';
  /** Minimum character level for the feature to be available. */
  minLevel: number;
  action: string;
  note: string;
}
export interface SpeciesEntry {
  id: string;
  /** Version group: one character may use exactly one entry of one family. */
  family: string;
  name: string;
  sourceCode: string;
  sourceTitle: string;
  edition: '2014' | '2024';
  status: SpeciesStatus;
  /** True only where the app holds licensed rules data for this exact entry. */
  verified: boolean;
  license: string;
  originFamily: string;
  // Mechanics (IMPLEMENTED entries only)
  size?: Size;
  speed?: number;
  darkvision?: number;
  asi?: Partial<Record<Ability, number>>;
  asiChoice?: { choose: number; from: Ability[]; bonus: number };
  traitIds?: string[];
  languages?: string[];
  hpPerLevel?: number;
  resistances?: string[];
  innate?: InnateFeature[];
  /** A choice the player must make, e.g. draconic ancestry or a cantrip. */
  choice?: { label: string; options: { id: string; label: string }[] };
}

interface SrdData {
  races: { i: string; n: string; speed: number; size: string; asi: Record<string, number>; asiChoice: { choose: number; from: string[]; bonus: number } | null; languages: string[]; traits: string[]; subraces: string[] }[];
  subraces: { i: string; n: string; race: string; asi: Record<string, number>; traits: string[] }[];
  traits: Record<string, { i: string; n: string; x: string }>;
}
const SRD = srd as unknown as SrdData;
export const SRD_TRAITS = SRD.traits;
export const SPECIES_ATTRIBUTION = 'Species data from the System Reference Document 5.1 by Wizards of the Coast LLC, licensed CC-BY-4.0.';

// Amendment §3 mapping (WORKING narrative; DM-only).
const ORIGIN: Record<string, string> = {
  human: 'Unmodified or broadly baseline-descended populations.',
  elf: 'Longevity, neural/sensory and circadian engineered lineage. Trance and inherited magic are neurological or limited Resonance traits, not proof of another plane.',
  dwarf: 'Compact, resilient lineage adapted to industrial and subterranean life.',
  halfling: 'Small-bodied lineage with refined motor and sensory adaptation; luck as probability-sensitive Resonance.',
  gnome: 'Small-bodied lineage with refined cognitive adaptation.',
  orc: 'Lineage engineered for strength, endurance and environmental adaptation. No species is innately savage.',
  tiefling: 'Distinctive heritable Resonance-reactive phenotype. No infernal ancestry required.',
  aasimar: 'Distinctive heritable Resonance-reactive phenotype. No celestial ancestry required.',
  dragonborn: 'Scaled bioengineered lineage; the breath weapon is a specialized organ or contained reaction.',
  kobold: 'Scaled bioengineered lineage.',
  genasi: 'Element-adapted, Resonance-stabilized physiology. No elemental planes.',
  goblinoid: 'Diverse engineered and adapted lineages and cultural communities; printed stereotypes are not biology.',
  composite: 'Anthropomorphic composite or adapted bioengineered lineage. Flight and gliding obey printed limits.',
  aquatic: 'Aquatic or amphibious engineered people; water requirements matter.',
  morph: 'Adaptive tissue or controlled morphology; does not defeat every biometric system.',
  mind: 'Neurocognitive symbiotic or engineered mind-sharing lineage. No dream-plane cosmology.',
  construct: 'Self-aware constructed person, treated as a person. Printed healing and rest rules govern.',
  soft: 'Cohesive synthetic/biological soft-body organism needing specialized accommodation.',
  insectoid: 'Insectoid composite lineage; extra limbs do only what the printed traits allow.',
  gith: 'Divergent neural and cultural lineage with unusual Resonance talents. No planar empire.',
  hybrid: 'Engineered hybrid phenotype. No mythological creator.',
  fairy: 'Miniaturized, flight-capable, Resonance-stabilized lineage.',
  specialized: 'Cognitively or biologically specialized or modular lineage. No imported setting institutions.',
  lifestate: 'Altered life-state or heritable modification through medicine, Resonance or experimental survival. No undeath cosmology.',
  small: 'Small-bodied, culturally distinct lineage.',
};

const ab = (k: string) => k.toUpperCase() as Ability;
const asiOf = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [ab(k), v])) as Partial<Record<Ability, number>>;
const merge = (a: Partial<Record<Ability, number>>, b: Partial<Record<Ability, number>>) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k as Ability] = (out[k as Ability] ?? 0) + (v ?? 0);
  return out;
};

export const DRACONIC_ANCESTRY = [
  { id: 'black', label: 'Black', type: 'acid', area: '5 by 30 ft line', save: 'DEX' },
  { id: 'blue', label: 'Blue', type: 'lightning', area: '5 by 30 ft line', save: 'DEX' },
  { id: 'brass', label: 'Brass', type: 'fire', area: '5 by 30 ft line', save: 'DEX' },
  { id: 'bronze', label: 'Bronze', type: 'lightning', area: '5 by 30 ft line', save: 'DEX' },
  { id: 'copper', label: 'Copper', type: 'acid', area: '5 by 30 ft line', save: 'DEX' },
  { id: 'gold', label: 'Gold', type: 'fire', area: '15 ft cone', save: 'DEX' },
  { id: 'green', label: 'Green', type: 'poison', area: '15 ft cone', save: 'CON' },
  { id: 'red', label: 'Red', type: 'fire', area: '15 ft cone', save: 'DEX' },
  { id: 'silver', label: 'Silver', type: 'cold', area: '15 ft cone', save: 'CON' },
  { id: 'white', label: 'White', type: 'cold', area: '15 ft cone', save: 'CON' },
];
const HIGH_ELF_CANTRIPS = ['Acid Splash', 'Chill Touch', 'Dancing Lights', 'Fire Bolt', 'Light', 'Mage Hand', 'Mending', 'Message', 'Minor Illusion', 'Poison Spray', 'Prestidigitation', 'Ray of Frost', 'Shocking Grasp', 'True Strike'];

const FAMILY: Record<string, string> = { 'half-elf': 'elf', 'half-orc': 'orc' };
const ORIGIN_KEY: Record<string, string> = { 'half-elf': 'elf', 'half-orc': 'orc' };

function srdEntry(raceId: string, subId?: string): SpeciesEntry {
  const r = SRD.races.find((x) => x.i === raceId)!;
  const s = subId ? SRD.subraces.find((x) => x.i === subId)! : undefined;
  const traitIds = [...r.traits, ...(s?.traits ?? [])].filter((t) => !t.startsWith('draconic-ancestry-'));
  const innate: InnateFeature[] = [];
  if (raceId === 'dragonborn') innate.push({ id: 'breath-weapon', name: 'Breath Weapon', uses: 1, recovery: 'SHORT_REST', minLevel: 1, action: 'Action', note: 'Damage 2d6 (3d6 at 6th level, 4d6 at 11th, 5d6 at 16th). Save DC 8 + CON modifier + proficiency bonus. Area and damage type from draconic ancestry.' });
  if (raceId === 'half-orc') innate.push({ id: 'relentless-endurance', name: 'Relentless Endurance', uses: 1, recovery: 'LONG_REST', minLevel: 1, action: 'When reduced to 0 HP but not killed', note: 'Drop to 1 HP instead.' });
  if (raceId === 'tiefling') {
    innate.push({ id: 'thaumaturgy', name: 'Infernal Legacy: thaumaturgy', uses: 0, recovery: 'NONE', minLevel: 1, action: '1 action', note: 'Cantrip, at will. Charisma is the casting ability.' });
    innate.push({ id: 'hellish-rebuke', name: 'Infernal Legacy: hellish rebuke (as 2nd level)', uses: 1, recovery: 'LONG_REST', minLevel: 3, action: '1 reaction', note: 'Printed limited use. Uses no spell slot and no RP.' });
    innate.push({ id: 'darkness', name: 'Infernal Legacy: darkness', uses: 1, recovery: 'LONG_REST', minLevel: 5, action: '1 action', note: 'Printed limited use. Uses no spell slot and no RP.' });
  }
  if (subId === 'high-elf') innate.push({ id: 'high-elf-cantrip', name: 'High Elf cantrip', uses: 0, recovery: 'NONE', minLevel: 1, action: 'As the cantrip', note: 'One wizard cantrip, at will. Intelligence is the casting ability.' });
  const name = s ? `${r.n} (${s.n.replace(new RegExp(`\\s*${r.n}$`, 'i'), '')})` : r.n;
  return {
    id: `srd-${subId ?? raceId}`, family: FAMILY[raceId] ?? raceId, name, sourceCode: 'SRD', sourceTitle: "SRD 5.1 (Player's Handbook 2014)", edition: '2014', status: 'IMPLEMENTED', verified: true,
    license: 'CC-BY-4.0 (SRD 5.1)', originFamily: ORIGIN[ORIGIN_KEY[raceId] ?? raceId] ?? ORIGIN.human,
    size: r.size as Size, speed: r.speed, darkvision: traitIds.includes('darkvision') ? 60 : 0,
    asi: merge(asiOf(r.asi), asiOf(s?.asi ?? {})),
    asiChoice: r.asiChoice ? { choose: r.asiChoice.choose, from: r.asiChoice.from.map(ab), bonus: r.asiChoice.bonus } : undefined,
    traitIds, languages: r.languages, hpPerLevel: traitIds.includes('dwarven-toughness') ? 1 : 0,
    resistances: raceId === 'tiefling' ? ['fire'] : traitIds.includes('dwarven-resilience') ? ['poison'] : [],
    innate,
    choice: raceId === 'dragonborn' ? { label: 'Draconic ancestry', options: DRACONIC_ANCESTRY.map((d) => ({ id: d.id, label: `${d.label} - ${d.type}, ${d.area}, ${d.save} save` })) }
      : subId === 'high-elf' ? { label: 'Wizard cantrip', options: HIGH_ELF_CANTRIPS.map((c) => ({ id: c.toLowerCase().replace(/ /g, '-'), label: c })) } : undefined,
  };
}

const IMPLEMENTED: SpeciesEntry[] = [
  srdEntry('human'),
  {
    id: 'phb-variant-human', family: 'human', name: 'Variant Human', sourceCode: 'PHB', sourceTitle: "Player's Handbook (2014), p. 31", edition: '2014', status: 'IMPLEMENTED', verified: false,
    license: 'Rule summarized in the app\'s own words; no book text stored. Already approved in the campaign Player Guide.', originFamily: ORIGIN.human,
    size: 'Medium', speed: 30, darkvision: 0, asi: {}, asiChoice: { choose: 2, from: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], bonus: 1 }, traitIds: [], languages: ['Common', 'one extra'],
    hpPerLevel: 0, resistances: [], innate: [],
  },
  srdEntry('dragonborn'), srdEntry('dwarf', 'hill-dwarf'), srdEntry('elf', 'high-elf'), srdEntry('gnome', 'rock-gnome'),
  srdEntry('half-elf'), srdEntry('half-orc'), srdEntry('halfling', 'lightfoot-halfling'), srdEntry('tiefling'),
];

// Official 2014-era species outside the SRD. Listed from memory: book codes and names must be
// confirmed against the table's own books before play. Abbreviations: PHB Player's Handbook;
// VGM Volo's Guide to Monsters; EEPC Elemental Evil Player's Companion; SCAG Sword Coast
// Adventurer's Guide; MTF Mordenkainen's Tome of Foes; ERLW Eberron: Rising from the Last War;
// GGR Guildmasters' Guide to Ravnica; MOT Mythic Odysseys of Theros; VRGR Van Richten's Guide to
// Ravenloft; WBW The Wild Beyond the Witchlight; FTD Fizban's Treasury of Dragons; MPMM
// Mordenkainen Presents: Monsters of the Multiverse; SJA Spelljammer: Adventures in Space;
// DSotDQ Dragonlance: Shadow of the Dragon Queen; TP The Tortle Package; OGA One Grung Above;
// LR Locathah Rising.
const SN: [family: string, name: string, code: string, title: string, origin: string][] = [
  ['dwarf', 'Dwarf (Mountain)', 'PHB', "Player's Handbook (2014)", 'dwarf'],
  ['elf', 'Elf (Wood)', 'PHB', "Player's Handbook (2014)", 'elf'],
  ['elf', 'Elf (Drow)', 'PHB', "Player's Handbook (2014)", 'elf'],
  ['halfling', 'Halfling (Stout)', 'PHB', "Player's Handbook (2014)", 'halfling'],
  ['gnome', 'Gnome (Forest)', 'PHB', "Player's Handbook (2014)", 'gnome'],
  ['aasimar', 'Aasimar', 'VGM', "Volo's Guide to Monsters", 'aasimar'],
  ['aasimar', 'Aasimar', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'aasimar'],
  ['firbolg', 'Firbolg', 'VGM', "Volo's Guide to Monsters", 'orc'],
  ['firbolg', 'Firbolg', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'orc'],
  ['goliath', 'Goliath', 'VGM', "Volo's Guide to Monsters", 'orc'],
  ['goliath', 'Goliath', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'orc'],
  ['kenku', 'Kenku', 'VGM', "Volo's Guide to Monsters", 'composite'],
  ['kenku', 'Kenku', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'composite'],
  ['lizardfolk', 'Lizardfolk', 'VGM', "Volo's Guide to Monsters", 'specialized'],
  ['lizardfolk', 'Lizardfolk', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'specialized'],
  ['tabaxi', 'Tabaxi', 'VGM', "Volo's Guide to Monsters", 'composite'],
  ['tabaxi', 'Tabaxi', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'composite'],
  ['triton', 'Triton', 'VGM', "Volo's Guide to Monsters", 'aquatic'],
  ['triton', 'Triton', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'aquatic'],
  ['bugbear', 'Bugbear', 'VGM', "Volo's Guide to Monsters", 'goblinoid'],
  ['bugbear', 'Bugbear', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'goblinoid'],
  ['goblin', 'Goblin', 'VGM', "Volo's Guide to Monsters", 'goblinoid'],
  ['goblin', 'Goblin', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'goblinoid'],
  ['hobgoblin', 'Hobgoblin', 'VGM', "Volo's Guide to Monsters", 'goblinoid'],
  ['hobgoblin', 'Hobgoblin', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'goblinoid'],
  ['kobold', 'Kobold', 'VGM', "Volo's Guide to Monsters", 'kobold'],
  ['kobold', 'Kobold', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'kobold'],
  ['orc', 'Orc', 'VGM', "Volo's Guide to Monsters", 'orc'],
  ['orc', 'Orc', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'orc'],
  ['yuan-ti', 'Yuan-ti Pureblood', 'VGM', "Volo's Guide to Monsters", 'hybrid'],
  ['yuan-ti', 'Yuan-ti', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'hybrid'],
  ['aarakocra', 'Aarakocra', 'EEPC', "Elemental Evil Player's Companion", 'composite'],
  ['aarakocra', 'Aarakocra', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'composite'],
  ['genasi', 'Genasi (Air / Earth / Fire / Water)', 'EEPC', "Elemental Evil Player's Companion", 'genasi'],
  ['genasi', 'Genasi (Air / Earth / Fire / Water)', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'genasi'],
  ['dwarf', 'Duergar', 'SCAG', "Sword Coast Adventurer's Guide", 'dwarf'],
  ['dwarf', 'Duergar', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'dwarf'],
  ['gnome', 'Deep Gnome', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'gnome'],
  ['elf', 'Eladrin', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'elf'],
  ['elf', 'Sea Elf', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'elf'],
  ['elf', 'Shadar-kai', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'elf'],
  ['gith', 'Githyanki', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'gith'],
  ['gith', 'Githzerai', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'gith'],
  ['changeling', 'Changeling', 'ERLW', 'Eberron: Rising from the Last War', 'morph'],
  ['changeling', 'Changeling', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'morph'],
  ['kalashtar', 'Kalashtar', 'ERLW', 'Eberron: Rising from the Last War', 'mind'],
  ['shifter', 'Shifter', 'ERLW', 'Eberron: Rising from the Last War', 'morph'],
  ['shifter', 'Shifter', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'morph'],
  ['warforged', 'Warforged', 'ERLW', 'Eberron: Rising from the Last War', 'construct'],
  ['centaur', 'Centaur', 'GGR', "Guildmasters' Guide to Ravnica", 'hybrid'],
  ['centaur', 'Centaur', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'hybrid'],
  ['loxodon', 'Loxodon', 'GGR', "Guildmasters' Guide to Ravnica", 'composite'],
  ['minotaur', 'Minotaur', 'GGR', "Guildmasters' Guide to Ravnica", 'hybrid'],
  ['minotaur', 'Minotaur', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'hybrid'],
  ['simic-hybrid', 'Simic Hybrid', 'GGR', "Guildmasters' Guide to Ravnica", 'specialized'],
  ['vedalken', 'Vedalken', 'GGR', "Guildmasters' Guide to Ravnica", 'specialized'],
  ['leonin', 'Leonin', 'MOT', 'Mythic Odysseys of Theros', 'composite'],
  ['satyr', 'Satyr', 'MOT', 'Mythic Odysseys of Theros', 'hybrid'],
  ['satyr', 'Satyr', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'hybrid'],
  ['tortle', 'Tortle', 'TP', 'The Tortle Package', 'composite'],
  ['tortle', 'Tortle', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'composite'],
  ['grung', 'Grung', 'OGA', 'One Grung Above', 'aquatic'],
  ['locathah', 'Locathah', 'LR', 'Locathah Rising', 'aquatic'],
  ['dhampir', 'Dhampir (lineage)', 'VRGR', "Van Richten's Guide to Ravenloft", 'lifestate'],
  ['hexblood', 'Hexblood (lineage)', 'VRGR', "Van Richten's Guide to Ravenloft", 'lifestate'],
  ['reborn', 'Reborn (lineage)', 'VRGR', "Van Richten's Guide to Ravenloft", 'lifestate'],
  ['fairy', 'Fairy', 'WBW', 'The Wild Beyond the Witchlight', 'fairy'],
  ['fairy', 'Fairy', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'fairy'],
  ['harengon', 'Harengon', 'WBW', 'The Wild Beyond the Witchlight', 'composite'],
  ['harengon', 'Harengon', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'composite'],
  ['dragonborn', 'Dragonborn (Chromatic / Metallic / Gem)', 'FTD', "Fizban's Treasury of Dragons", 'dragonborn'],
  ['elf', 'Astral Elf', 'SJA', 'Spelljammer: Adventures in Space', 'elf'],
  ['autognome', 'Autognome', 'SJA', 'Spelljammer: Adventures in Space', 'construct'],
  ['giff', 'Giff', 'SJA', 'Spelljammer: Adventures in Space', 'composite'],
  ['hadozee', 'Hadozee', 'SJA', 'Spelljammer: Adventures in Space', 'composite'],
  ['plasmoid', 'Plasmoid', 'SJA', 'Spelljammer: Adventures in Space', 'soft'],
  ['thri-kreen', 'Thri-kreen', 'SJA', 'Spelljammer: Adventures in Space', 'insectoid'],
  ['kender', 'Kender', 'DSotDQ', 'Dragonlance: Shadow of the Dragon Queen', 'small'],
];
const SOURCE_NEEDED: SpeciesEntry[] = SN.map(([family, name, code, title, origin]) => ({
  id: `${code.toLowerCase()}-${name.toLowerCase().replace(/\(lineage\)/, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}`,
  family, name, sourceCode: code, sourceTitle: title, edition: '2014', status: 'SOURCE_NEEDED', verified: false,
  license: 'Rules text not licensed for reproduction here. Enter the traits from your own copy of the book.', originFamily: ORIGIN[origin] ?? '',
}));
// The catch-all, for an official species this list missed.
SOURCE_NEEDED.push({
  id: 'other-official', family: 'other', name: 'Another official species (name it)', sourceCode: 'OTHER', sourceTitle: 'Name the book and page', edition: '2014', status: 'SOURCE_NEEDED', verified: false,
  license: 'Enter the traits from your own copy of the book. Homebrew and third-party species need separate approval.', originFamily: 'WORKING: write a Divergence origin with the DM (amendment §3).',
});

const PHB24 = ['Aasimar', 'Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath', 'Halfling', 'Human', 'Orc', 'Tiefling'];
const NOT_SUPPORTED: SpeciesEntry[] = PHB24.map((n) => ({
  id: `phb24-${n.toLowerCase()}`, family: n.toLowerCase(), name: n, sourceCode: 'PHB24', sourceTitle: "Player's Handbook (2024)", edition: '2024', status: 'NOT_SUPPORTED', verified: false,
  license: '2024 revision. Not supported: the campaign baseline is 2014 and adopting 2024 species is an OPEN DM decision.', originFamily: '',
}));

export const SPECIES: SpeciesEntry[] = [...IMPLEMENTED, ...SOURCE_NEEDED, ...NOT_SUPPORTED];
export const speciesById = (id: string | undefined) => SPECIES.find((s) => s.id === id);
export const speciesLabel = (s: SpeciesEntry) => `${s.name} · ${s.sourceCode}${s.edition === '2024' ? ' 2024' : ''}`;

export function speciesCoverage() {
  const by = (st: SpeciesStatus) => SPECIES.filter((s) => s.status === st && s.id !== 'other-official');
  return { implemented: by('IMPLEMENTED').length, sourceNeeded: by('SOURCE_NEEDED').length, notSupported: by('NOT_SUPPORTED').length, families: new Set(SPECIES.map((s) => s.family)).size };
}
