// Level-3 character creation rules and validation (2014 5e base, PLAYTEST classes).
import { classById } from '../content/classes';
import { POINT_BUY_BUDGET, POINT_BUY_COST, STANDARD_ARRAY, backgroundSkills } from '../content/rules';
import { PATTERNS } from '../content/spells';
import type { Ability, Discipline, PC } from './types';
import { abilityMod, maxPatternLevel, proficiencyBonus } from './rules';
import { physiology, speciesAsi, validateSpecies, type SpeciesSelection } from './species';
import { speciesById } from '../content/species';

export const ABILITIES: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
export type Scores = Record<Ability, number>;
export type ScoreMethod = 'ARRAY' | 'POINT_BUY';

export const pointBuyCost = (s: Scores): number => ABILITIES.reduce((sum, a) => sum + (POINT_BUY_COST[s[a]] ?? Infinity), 0);

/** Validate base scores (before species adjustments). */
export function validateScores(method: ScoreMethod, s: Scores): string[] {
  const errors: string[] = [];
  const values = ABILITIES.map((a) => s[a]);
  if (method === 'ARRAY') {
    if ([...values].sort((a, b) => b - a).join() !== [...STANDARD_ARRAY].sort((a, b) => b - a).join()) {
      errors.push(`Standard array: assign each of ${STANDARD_ARRAY.join(', ')} exactly once.`);
    }
  } else {
    if (values.some((v) => v < 8 || v > 15)) errors.push('Point buy scores must be between 8 and 15 before bonuses.');
    else if (pointBuyCost(s) > POINT_BUY_BUDGET) errors.push(`Point buy spends ${pointBuyCost(s)} of ${POINT_BUY_BUDGET} points.`);
  }
  return errors;
}

/** Apply the selected species' 2014 ability adjustments exactly once. */
export function applySpecies(base: Scores, sel: SpeciesSelection): Scores {
  const out = { ...base };
  for (const [a, v] of Object.entries(speciesAsi(sel))) out[a as Ability] += v ?? 0;
  return out;
}

/** Fixed (average) hit points: full die at level 1, then die/2 + 1 per level, plus CON modifier (and any species bonus) each level. */
export function hpAtLevel(hitDie: number, conMod: number, level: number, perLevelBonus = 0): number {
  return Math.max(level, hitDie + (level - 1) * (hitDie / 2 + 1) + level * (conMod + perLevelBonus));
}

export interface Draft {
  name: string;
  species: SpeciesSelection;
  classId: string;
  method: ScoreMethod;
  base: Scores;
  background: string;
  classSkills: string[];
  attunement: Discipline | 'UNATTUNED';
  reasonInFrostward: string;
  linkToPc: string;
}

export function validateDraft(d: Draft): string[] {
  const errors: string[] = [];
  const c = classById(d.classId);
  if (!d.name.trim()) errors.push('Give the character a name.');
  if (!c) errors.push('Choose one of the six Solmourn classes.');
  errors.push(...validateSpecies(d.species), ...validateScores(d.method, d.base));
  if (c?.skillChoices) {
    const bg = backgroundSkills(d.background);
    const picks = new Set(d.classSkills);
    if (picks.size !== c.skillChoices.count) errors.push(`${c.name}: choose ${c.skillChoices.count} class skills (${picks.size} chosen).`);
    for (const s of picks) {
      if (!c.skillChoices.from.includes(s)) errors.push(`${s} is not on the ${c.name} skill list.`);
      if (bg.includes(s)) errors.push(`${s} already comes from the ${d.background} background; pick a different class skill.`);
    }
  }
  if (d.classId === 'resonant' && d.attunement === 'UNATTUNED') errors.push('A Resonant must be Attuned to one discipline.');
  if (!d.reasonInFrostward.trim()) errors.push('Say why the character is in Frostward when the first blackout happens.');
  if (!d.linkToPc.trim()) errors.push('Give one existing connection to another PC.');
  return errors;
}

export interface Derived {
  speciesName: string;
  scores: Scores;
  hp: number;
  proficiencyBonus: number;
  skills: string[];
  patternbookSize: number;
  maxPatternLevel: number;
  availablePatterns: number;
}
export function derive(d: Draft, level = 3): Derived {
  const c = classById(d.classId);
  const scores = applySpecies(d.base, d.species);
  const body = physiology(d.species);
  const resonant = d.classId === 'resonant';
  return {
    scores,
    hp: hpAtLevel(c?.hitDie ?? 8, abilityMod(scores.CON), level, body.hpPerLevel),
    speciesName: speciesById(d.species.entryId)?.name ?? '—',
    proficiencyBonus: proficiencyBonus(level),
    skills: [...new Set([...backgroundSkills(d.background), ...d.classSkills])],
    patternbookSize: resonant ? 6 + 2 * (level - 1) : 0,
    maxPatternLevel: resonant ? maxPatternLevel(level) : 0,
    availablePatterns: resonant ? PATTERNS.filter((p) => p.discipline === d.attunement && p.level >= 1 && p.level <= maxPatternLevel(level)).length : 0,
  };
}
