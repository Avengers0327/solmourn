// Species rules: selection validation, ability adjustments, senses/movement and innate features.
// Species features are their own resource category ("species:*"). They never create, refund or
// spend Resonance Points, Patterns, Amplification or Emergency uses.
import { DRACONIC_ANCESTRY, speciesById, type InnateFeature, type Size, type SpeciesEntry } from '../content/species';
import type { Ability, PC, Resource } from './types';

export interface ManualSpecies {
  bookRef: string;
  asi: Partial<Record<Ability, number>>;
  size: Size;
  speed: number;
  fly: number;
  swim: number;
  climb: number;
  darkvision: number;
  resistances: string;
  naturalArmor: string;
  traitsMd: string;
  innate: InnateFeature[];
}
export interface SpeciesSelection {
  entryId: string;
  /** Draconic ancestry, high elf cantrip, … */
  choiceId?: string;
  /** Picks for "+1 to N abilities of your choice" (half-elf, variant human). */
  asiPicks?: Ability[];
  /** SOURCE_NEEDED species: traits entered by the DM from the book. */
  manual?: ManualSpecies;
  /** Mixed heritage is narrative only: one rules package, never two. */
  heritageNote?: string;
  dmApproved?: boolean;
}
export const blankManual = (): ManualSpecies => ({ bookRef: '', asi: {}, size: 'Medium', speed: 30, fly: 0, swim: 0, climb: 0, darkvision: 0, resistances: '', naturalArmor: '', traitsMd: '', innate: [] });

/** Species of an existing PC. PCs made before the Divergence amendment stay valid as humans. */
export function speciesSelectionOf(pc: Pick<PC, 'ancestry' | 'species'>): SpeciesSelection {
  if (pc.species?.entryId) return pc.species;
  return { entryId: pc.ancestry === 'Variant Human' ? 'phb-variant-human' : 'srd-human' };
}

export function validateSpecies(sel: SpeciesSelection & { extraEntryIds?: string[] }): string[] {
  const e = speciesById(sel.entryId);
  if (!e) return ['Choose a species from the catalog.'];
  const errors: string[] = [];
  if (e.status === 'NOT_SUPPORTED') errors.push(`${e.name} (${e.sourceTitle}) is a 2024 revision. The campaign uses 2014 rules; pick the 2014-era version.`);
  if (sel.extraEntryIds?.length) errors.push('Only one species rules package per character. Describe mixed heritage in the heritage note.');
  if (e.asiChoice) {
    const picks = sel.asiPicks ?? [];
    if (new Set(picks).size !== e.asiChoice.choose || picks.some((p) => !e.asiChoice!.from.includes(p))) {
      errors.push(`${e.name}: choose ${e.asiChoice.choose} different abilities for +${e.asiChoice.bonus}${e.asi && Object.keys(e.asi).length ? ` (not ${Object.keys(e.asi).join('/')})` : ''}.`);
    }
  }
  if (e.choice && !e.choice.options.some((o) => o.id === sel.choiceId)) errors.push(`${e.name}: choose a ${e.choice.label.toLowerCase()}.`);
  if (e.status === 'SOURCE_NEEDED') {
    const m = sel.manual;
    if (!m) errors.push(`${e.name}: enter the traits from your book.`);
    else {
      if (!m.bookRef.trim()) errors.push(`${e.name}: give the book and page for the rules you are using.`);
      const vals = Object.values(m.asi).filter((v): v is number => typeof v === 'number');
      if (vals.some((v) => v < -2 || v > 2) || vals.reduce((a, b) => a + b, 0) > 3) errors.push('Species ability increases (2014): each between -2 and +2, total +3 at most.');
      for (const [k, v] of [['speed', m.speed], ['fly', m.fly], ['swim', m.swim], ['climb', m.climb], ['darkvision', m.darkvision]] as const) {
        if (!(Number.isFinite(v) && v >= 0 && v <= 120)) errors.push(`${k} must be a number of feet between 0 and 120.`);
      }
    }
  }
  return errors;
}

export function speciesAsi(sel: SpeciesSelection): Partial<Record<Ability, number>> {
  const e = speciesById(sel.entryId);
  if (!e) return {};
  const out: Partial<Record<Ability, number>> = { ...(e.status === 'SOURCE_NEEDED' ? sel.manual?.asi ?? {} : e.asi ?? {}) };
  if (e.asiChoice) for (const a of (sel.asiPicks ?? []).slice(0, e.asiChoice.choose)) out[a] = (out[a] ?? 0) + e.asiChoice.bonus;
  return out;
}

export interface Physiology { size: Size; speed: number; fly: number; swim: number; climb: number; darkvision: number; resistances: string[]; naturalArmor: string; hpPerLevel: number }
export function physiology(sel: SpeciesSelection): Physiology {
  const e = speciesById(sel.entryId);
  if (e?.status === 'SOURCE_NEEDED' && sel.manual) {
    const m = sel.manual;
    return { size: m.size, speed: m.speed, fly: m.fly, swim: m.swim, climb: m.climb, darkvision: m.darkvision, resistances: m.resistances.split(',').map((s) => s.trim()).filter(Boolean), naturalArmor: m.naturalArmor, hpPerLevel: 0 };
  }
  const dragon = e?.id === 'srd-dragonborn' ? DRACONIC_ANCESTRY.find((d) => d.id === sel.choiceId) : undefined;
  return {
    size: e?.size ?? 'Medium', speed: e?.speed ?? 30, fly: 0, swim: 0, climb: 0, darkvision: e?.darkvision ?? 0,
    resistances: [...(e?.resistances ?? []), ...(dragon ? [dragon.type] : [])], naturalArmor: '', hpPerLevel: e?.hpPerLevel ?? 0,
  };
}

/** Innate features available at this level, with any choice resolved into the text. */
export function innateFeatures(sel: SpeciesSelection, level: number): InnateFeature[] {
  const e: SpeciesEntry | undefined = speciesById(sel.entryId);
  const list = e?.status === 'SOURCE_NEEDED' ? sel.manual?.innate ?? [] : e?.innate ?? [];
  const dragon = DRACONIC_ANCESTRY.find((d) => d.id === sel.choiceId);
  return list.filter((f) => level >= (f.minLevel ?? 1)).map((f) => {
    if (f.id === 'breath-weapon' && dragon) {
      const dice = level >= 16 ? 5 : level >= 11 ? 4 : level >= 6 ? 3 : 2;
      return { ...f, note: `${dice}d6 ${dragon.type}, ${dragon.area}, ${dragon.save} save DC 8 + CON modifier + proficiency bonus; half on a success.` };
    }
    if (f.id === 'high-elf-cantrip' && e?.choice) return { ...f, name: `High Elf cantrip: ${e.choice.options.find((o) => o.id === sel.choiceId)?.label ?? 'not chosen'}` };
    return f;
  });
}

/** Species resources for syncResources. Keys are always "species:*"; at-will features need none. */
export function speciesResources(pc: Pick<PC, 'ancestry' | 'species' | 'level'>): Omit<Resource, 'current'>[] {
  return innateFeatures(speciesSelectionOf(pc), pc.level)
    .filter((f) => f.uses > 0)
    .map((f) => ({ key: `species:${f.id}`, name: f.name, max: f.uses, recovery: f.recovery === 'SHORT_REST' ? 'SHORT_REST' as const : f.recovery === 'LONG_REST' ? 'LONG_REST' as const : 'NONE' as const }));
}

export const speciesName = (pc: Pick<PC, 'ancestry' | 'species'>) => speciesById(speciesSelectionOf(pc).entryId)?.name ?? pc.ancestry;
