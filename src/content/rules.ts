// Player-safe rules tables from 02_PLAYER_GUIDE.md (PLAYTEST homebrew on a 2014 5e base).
import type { Discipline } from '../domain/types';

/** RP cost by Pattern level; index 0 is a cantrip. */
export const RP_COST = [0, 2, 3, 5, 6, 7, 9, 10, 11, 13] as const;
/** Full-caster RP pool at caster levels 1-20. */
export const RP_POOL = [4, 6, 14, 17, 27, 32, 38, 44, 57, 64, 73, 73, 83, 83, 94, 94, 107, 114, 123, 133] as const;

export const AMP_TIERS = [
  { tier: 1, extraRp: 2, strainDice: 1, conDc: 12 },
  { tier: 2, extraRp: 4, strainDice: 2, conDc: 15 },
  { tier: 3, extraRp: 6, strainDice: 4, conDc: 18 },
  { tier: 4, extraRp: 8, strainDice: 6, conDc: 21 },
] as const;
export const AMP_USES_PER_LONG_REST = 2;
export const EMERGENCY_MAX_BORROW = 2;

export const AMP_ENHANCEMENTS = [
  { id: 'damage', label: 'Damage', text: (t: number) => `One target takes +${t} spell-damage di${t > 1 ? 'ce' : 'e'} (even for an area Pattern).` },
  { id: 'healing', label: 'Healing', text: (t: number) => `+${t}d8 to one healing roll.` },
  { id: 'range', label: 'Range', text: (t: number) => `Range ×${2 ** t} (doubled per tier).` },
  { id: 'duration', label: 'Duration', text: (t: number) => `Duration ×${2 ** t} (max 24 h; concentration still applies).` },
  { id: 'area', label: 'Area', text: (t: number) => `Area +${5 * t} ft radius, or +${10 * t} ft line/cone.` },
  { id: 'dc', label: 'Save DC', text: (t: number) => (t < 2 ? 'Needs tier +2 or higher (+1 DC per 2 tiers).' : `+${Math.min(2, Math.floor(t / 2))} spell-save DC (max +2).`) },
] as const;

export const DISCIPLINES: { id: Discipline; name: string; domain: string }[] = [
  { id: 'RADIANCE', name: 'Radiance', domain: 'Light, heat, electricity, cold and energy' },
  { id: 'KINESIS', name: 'Kinesis', domain: 'Force, movement, gravity and momentum' },
  { id: 'VITALITY', name: 'Vitality', domain: 'Healing, anatomy, disease, poison and living systems' },
  { id: 'VEIL', name: 'Veil', domain: 'Illusions, perception, emotion and memory' },
  { id: 'FORM', name: 'Form', domain: 'Matter, shapes, material properties and structure' },
  { id: 'ECHO', name: 'Echo', domain: 'Information, traces, detection and signals' },
];
export const disciplineName = (d: string) => DISCIPLINES.find((x) => x.id === d)?.name ?? 'Unattuned';

export const DISTRICTS = ['Everflame Sanctum', 'Imperial Crown', 'Gilded Ring', 'Inner Wards', 'Foundries', 'Frostward'];
export const BACKGROUNDS = [
  { name: 'Crown Scion', skills: 'History, Insight', perk: 'Etiquette and access to some privileged society' },
  { name: 'Gilded Citizen', skills: 'Persuasion, Investigation', perk: 'Commercial credentials and licensed contacts' },
  { name: 'Ward Resident', skills: 'Insight, Perception', perk: 'Shelter and local neighborhood rumor network' },
  { name: 'Foundry Worker', skills: 'Athletics, Investigation', perk: 'Trade knowledge, union/coworker contacts, workshop access' },
  { name: 'Frostward Survivor', skills: 'Survival, Stealth', perk: 'Mutual aid and improvised shelter contacts' },
];
export const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed',
  'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
];
export const QUICK_DCS = [
  { dc: 10, label: 'Easy' },
  { dc: 13, label: 'Standard / intermediate' },
  { dc: 15, label: 'Moderate / difficult' },
  { dc: 20, label: 'Hard' },
];

export const SKILLS = ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'];
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const POINT_BUY_BUDGET = 27;
/** District background → skills. Tool/language picks are agreed with the DM. */
export const backgroundSkills = (name: string) => (BACKGROUNDS.find((b) => b.name === name)?.skills ?? '').split(', ').filter(Boolean);
