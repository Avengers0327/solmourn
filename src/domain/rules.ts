// Pure rules calculators. Nothing here writes to storage: the UI shows a result and the DM
// confirms before any resource is spent.
import { CLASSES, DEVICES, classById, deviceSlots } from '../content/classes';
import { AMP_TIERS, AMP_USES_PER_LONG_REST, EMERGENCY_MAX_BORROW, RP_COST, RP_POOL } from '../content/rules';
import type { FeatureDefinition, PC, Pattern, Resource } from './types';
import { speciesResources } from './species';

export const abilityMod = (score: number) => Math.floor((score - 10) / 2);
export const proficiencyBonus = (level: number) => 2 + Math.floor((Math.max(1, level) - 1) / 4);
export const maxPatternLevel = (casterLevel: number) => Math.min(9, Math.ceil(casterLevel / 2));
export const rpPool = (casterLevel: number) => RP_POOL[Math.min(20, Math.max(1, casterLevel)) - 1];
export const fmtMod = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function featureUses(f: FeatureDefinition, level: number): number {
  if (!f.uses) return 0;
  const step = [...f.uses].filter(([min]) => min <= level).pop();
  if (!step) return 0;
  return step[1] === 'PB' ? proficiencyBonus(level) : step[1];
}

/** Features a PC currently has, by class and level. */
export function featuresFor(pc: Pick<PC, 'classId' | 'level'>): FeatureDefinition[] {
  const c = classById(pc.classId);
  return c ? c.features.filter((f) => f.level <= pc.level).sort((a, b) => a.level - b.level) : [];
}

/** Rebuild a PC's resource list from the class data, preserving current counts where possible. */
export function syncResources(pc: PC): Resource[] {
  const pb = proficiencyBonus(pc.level);
  const wanted: Omit<Resource, 'current'>[] = [];
  if (pc.classId === 'resonant') {
    wanted.push({ key: 'rp', name: 'Resonance Points', max: rpPool(pc.level), recovery: 'LONG_REST' });
    wanted.push({ key: 'amp', name: 'Amplification uses', max: AMP_USES_PER_LONG_REST, recovery: 'LONG_REST' });
    wanted.push({ key: 'emergency', name: 'Emergency Overcasting', max: 1, recovery: 'LONG_REST' });
  }
  for (const f of featuresFor(pc)) {
    const max = featureUses(f, pc.level);
    if (max > 0) wanted.push({ key: f.id, name: f.name, max, recovery: f.recovery ?? 'LONG_REST' });
  }
  if (pc.classId === 'machinist') {
    for (const id of pc.rigIds.slice(0, deviceSlots(pc.level))) {
      const d = DEVICES.find((x) => x.id === id);
      if (d) wanted.push({ key: `device:${id}`, name: `${d.name} activations`, max: pb, recovery: 'LONG_REST' });
    }
  }
  if (pc.classId === 'votary') {
    const kit = pc.resources.find((r) => r.key === 'healer-kit');
    wanted.push({ key: 'healer-kit', name: "Healer's kit charges", max: kit?.max ?? 10, recovery: 'NONE' });
  }
  // Species innate features: their own category, never RP (Divergence amendment §4.6).
  wanted.push(...speciesResources(pc));
  const custom = pc.resources.filter((r) => r.recovery === 'CUSTOM');
  return [
    ...wanted.map((w) => {
      const old = pc.resources.find((r) => r.key === w.key);
      return { ...w, current: old ? Math.min(old.current, w.max) : w.max };
    }),
    ...custom,
  ];
}

export const getRes = (pc: PC, key: string) => pc.resources.find((r) => r.key === key);
const setRes = (pc: PC, key: string, current: number): PC => ({
  ...pc,
  resources: pc.resources.map((r) => (r.key === key ? { ...r, current: Math.max(0, Math.min(r.max, current)) } : r)),
});

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

/** Spend one use of a feature, including any linked cost (e.g. a healer's-kit charge). */
export function useFeature(pc: PC, featureId: string): Outcome<PC> {
  const res = getRes(pc, featureId);
  if (!res) return { ok: false, error: 'This character does not have that feature.' };
  if (res.current < 1) return { ok: false, error: `No ${res.name} uses left.` };
  const def = CLASSES.flatMap((c) => c.features).find((f) => f.id === featureId);
  for (const extra of def?.alsoConsumes ?? []) {
    const r = getRes(pc, extra.key);
    if (!r || r.current < extra.amount) {
      return { ok: false, error: `Needs ${extra.amount} × ${r?.name ?? extra.key} as well, and there are not enough.` };
    }
  }
  let next = setRes(pc, featureId, res.current - 1);
  for (const extra of def?.alsoConsumes ?? []) next = setRes(next, extra.key, getRes(next, extra.key)!.current - extra.amount);
  return { ok: true, value: next };
}

export function adjustResource(pc: PC, key: string, delta: number): PC {
  const r = getRes(pc, key);
  return r ? setRes(pc, key, r.current + delta) : pc;
}

/** Short rest restores short-rest resources only. Long rest restores both, HP, and clears strain trackers. */
export function applyRest(pc: PC, kind: 'SHORT' | 'LONG'): PC {
  const restores = (r: Resource) => r.recovery === 'SHORT_REST' || (kind === 'LONG' && r.recovery === 'LONG_REST');
  const resources = pc.resources.map((r) => (restores(r) ? { ...r, current: r.max } : r));
  if (kind === 'SHORT') return { ...pc, resources };
  return {
    ...pc,
    resources,
    hp: pc.maxHp,
    tempHp: 0,
    highLevelUsed: [],
    exhaustion: Math.max(0, pc.exhaustion - 1),
    deathSaves: { successes: 0, failures: 0 },
  };
}

// ---- Patternbook legality ----
export function canAddToBook(pc: PC, pattern: Pattern): Outcome<true> {
  if (pc.classId !== 'resonant') return { ok: false, error: 'Only the Resonant class has independent Patterncasting.' };
  if (pc.attunement === 'UNATTUNED') return { ok: false, error: 'A Resonant must be Attuned to one discipline.' };
  if (pattern.discipline !== pc.attunement) {
    return { ok: false, error: `${pattern.name} is a ${pattern.discipline.toLowerCase()} Pattern; this character is attuned to ${pc.attunement.toLowerCase()} only.` };
  }
  if (pattern.level > maxPatternLevel(pc.level)) {
    return { ok: false, error: `Level ${pattern.level} Patterns are not accessible at caster level ${pc.level}.` };
  }
  return { ok: true, value: true };
}
export const prepareLimit = (pc: PC) => Math.max(1, pc.level + abilityMod(pc.abilities.INT));
export function canPrepare(pc: PC, pattern: Pattern): Outcome<true> {
  const legal = canAddToBook(pc, pattern);
  if (!legal.ok) return legal;
  if (!pc.patternIds.includes(pattern.id)) return { ok: false, error: 'Not in the Patternbook.' };
  if (pattern.level === 0) return { ok: true, value: true };
  const prepared = pc.preparedIds.filter((id) => id !== pattern.id).length;
  if (prepared >= prepareLimit(pc)) return { ok: false, error: `Preparation limit reached (${prepareLimit(pc)}).` };
  return { ok: true, value: true };
}

// ---- Casting / overcasting calculator ----
export interface CastInput {
  casterLevel: number;
  currentRp: number;
  patternLevel: number;
  ampTier?: 0 | 1 | 2 | 3 | 4;
  enhancement?: string;
  emergency?: boolean;
  ampUsesLeft: number;
  emergencyAvailable: boolean;
  highLevelUsed: number[];
}
export interface CastResult {
  ok: boolean;
  errors: string[];
  baseCost: number;
  ampCost: number;
  totalCost: number; // RP actually leaving the pool
  borrowed: number;
  strain: string | null; // e.g. "2d6"
  strainDice: number;
  strainNote: string;
  conDc: number | null;
  rpAfter: number;
  usesAmp: boolean;
  usesEmergency: boolean;
  marksHighLevel: number | null;
}

export function calcCast(i: CastInput): CastResult {
  const errors: string[] = [];
  const tier = i.ampTier ?? 0;
  const baseCost = RP_COST[i.patternLevel] ?? 0;
  const amp = AMP_TIERS.find((t) => t.tier === tier);
  const ampCost = amp?.extraRp ?? 0;
  let borrowed = 0;

  if (i.patternLevel < 0 || i.patternLevel > 9) errors.push('Pattern level must be 0-9.');
  if (i.patternLevel > maxPatternLevel(i.casterLevel)) {
    errors.push(`A level ${i.casterLevel} caster can access Pattern levels up to ${maxPatternLevel(i.casterLevel)} only. Overcasting never grants a higher level.`);
  }
  if (i.patternLevel >= 6 && i.highLevelUsed.includes(i.patternLevel)) {
    errors.push(`A level ${i.patternLevel} Pattern has already been cast since the last long rest (levels 6-9 are once per long rest).`);
  }
  if (amp && i.emergency) errors.push('Emergency Overcasting cannot be combined with Amplification.');
  if (amp && i.ampUsesLeft < 1) errors.push('No Amplification uses left until a long rest.');
  if (amp && i.enhancement === 'dc' && tier < 2) errors.push('The save-DC enhancement needs tier +2 or higher.');

  if (i.emergency && !amp) {
    if (!i.emergencyAvailable) errors.push('Emergency Overcasting has already been used since the last long rest.');
    borrowed = baseCost - i.currentRp;
    if (borrowed <= 0) {
      errors.push('There is enough RP for this Pattern, so there is nothing missing to borrow.');
      borrowed = 0;
    } else if (borrowed > EMERGENCY_MAX_BORROW) {
      errors.push(`Missing ${borrowed} RP; Emergency Overcasting can borrow at most ${EMERGENCY_MAX_BORROW}.`);
    }
  } else if (i.currentRp < baseCost + ampCost) {
    errors.push(`Needs ${baseCost + ampCost} RP; only ${i.currentRp} available.`);
  }

  const totalCost = i.emergency && !amp ? Math.min(baseCost, i.currentRp) : baseCost + ampCost;
  const strainDice = amp ? amp.strainDice : borrowed;
  return {
    ok: errors.length === 0,
    errors,
    baseCost,
    ampCost,
    totalCost,
    borrowed,
    strain: strainDice > 0 ? `${strainDice}d6` : null,
    strainDice,
    strainNote: amp ? 'unavoidable strain damage' : borrowed ? 'unavoidable force damage' : '',
    conDc: amp ? amp.conDc : borrowed ? 10 + 2 * borrowed : null,
    rpAfter: Math.max(0, i.currentRp - totalCost),
    usesAmp: !!amp,
    usesEmergency: !!i.emergency && !amp && borrowed > 0,
    marksHighLevel: i.patternLevel >= 6 ? i.patternLevel : null,
  };
}

export function castInputFor(pc: PC, patternLevel: number, opts: Pick<CastInput, 'ampTier' | 'emergency' | 'enhancement'> = {}): CastInput {
  return {
    casterLevel: pc.level,
    currentRp: getRes(pc, 'rp')?.current ?? 0,
    patternLevel,
    ampUsesLeft: getRes(pc, 'amp')?.current ?? 0,
    emergencyAvailable: (getRes(pc, 'emergency')?.current ?? 0) > 0,
    highLevelUsed: pc.highLevelUsed,
    ...opts,
  };
}

/** Apply a confirmed cast to a PC. Never called automatically. Strain and exhaustion stay manual. */
export function applyCast(pc: PC, r: CastResult): Outcome<PC> {
  if (!r.ok) return { ok: false, error: r.errors.join(' ') };
  let next = setRes(pc, 'rp', r.rpAfter);
  if (r.usesAmp) next = adjustResource(next, 'amp', -1);
  if (r.usesEmergency) next = adjustResource(next, 'emergency', -1);
  if (r.marksHighLevel) next = { ...next, highLevelUsed: [...next.highLevelUsed, r.marksHighLevel] };
  return { ok: true, value: next };
}

// ---- Dice ----
export function rollDie(sides: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / sides) * sides;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return (buf[0] % sides) + 1;
}
export const rollDice = (count: number, sides: number) => Array.from({ length: count }, () => rollDie(sides));

// ---- Group technique (trial) validation; labels and DCs come from the campaign pack ----
export interface TrialConfig {
  emergentLabel: string;
  controlledLabel: string;
  emergentStages: { name: string; dc: number }[];
  controlled: { minParticipants: number; minSources: number; leadDc: number; rpPerCaster: number; usesPerLongRest: number; durationNote: string };
  effects: string[];
  forbiddenPattern: string;
  forbiddenMessage: string;
  dmNote: string;
}
export function validateControlledTrial(
  cfg: TrialConfig,
  t: { participants: string[]; sources: string[]; effect: string; usedSinceLongRest: number },
): string[] {
  const errors: string[] = [];
  const distinct = new Set(t.sources.map((s) => s.trim().toLowerCase()).filter(Boolean));
  if (t.participants.filter((x) => x.trim()).length < cfg.controlled.minParticipants) {
    errors.push(`Needs at least ${cfg.controlled.minParticipants} participants.`);
  }
  if (distinct.size < cfg.controlled.minSources) errors.push(`Needs at least ${cfg.controlled.minSources} distinct discipline sources.`);
  if (t.usedSinceLongRest >= cfg.controlled.usesPerLongRest) errors.push('The group use for this long rest is already spent.');
  if (!t.effect.trim()) errors.push('Choose one bounded effect.');
  if (cfg.forbiddenPattern && new RegExp(cfg.forbiddenPattern, 'i').test(t.effect)) errors.push(cfg.forbiddenMessage);
  return errors;
}
