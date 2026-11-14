// Player-safe PLAYTEST class data, transcribed from 02_PLAYER_GUIDE.md.
// Rules live here as typed records; UI code never hard-codes class behaviour.
import type { ClassDefinition, DeviceDefinition, FeatureDefinition } from '../domain/types';

type F = Omit<FeatureDefinition, 'classId' | 'id'> & { id?: string };
const cls = (
  id: string,
  name: string,
  hitDie: number,
  mainAbility: string,
  saves: string,
  summary: string,
  proficienciesMd: string,
  features: F[],
): ClassDefinition => ({
  id,
  name,
  hitDie,
  mainAbility,
  saves,
  summary,
  proficienciesMd,
  playtestStatus: 'PLAYTEST',
  features: features.map((f) => ({
    ...f,
    classId: id,
    id: f.id ?? `${id}:${f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  })),
});
const asi = (...levels: number[]): F[] =>
  levels.map((level) => ({ level, name: 'ASI', id: `asi-${level}`, rulesMd: 'Ability score improvement or a permitted feat.', actionEconomy: 'PASSIVE' }));
const std = (level: number, name: string, extra: Partial<F> = {}): F => ({
  level,
  name,
  rulesMd: 'Works as the published 2014 feature of the same name (see your rulebook).',
  ...extra,
});

export const CLASSES: ClassDefinition[] = [
  cls('warden', 'Warden', 10, 'STR or DEX', 'STR / CON', 'Shield allies, fight, hold positions. Straightforward martial.',
    'All armor and shields, simple and martial weapons. Two of Athletics, Acrobatics, Intimidation, Insight, Perception, Survival. Fighter chassis.', [
      std(1, 'Fighting Style', { actionEconomy: 'PASSIVE' }),
      std(1, 'Second Wind', { actionEconomy: 'BONUS', uses: [[1, 1]], recovery: 'SHORT_REST' }),
      std(2, 'Action Surge', { uses: [[2, 1], [17, 2]], recovery: 'SHORT_REST' }),
      { level: 3, name: 'Guard Stance', actionEconomy: 'BONUS', rulesMd: 'Bonus action: designate an ally within 5 ft. Until your next turn, when an attacker you can see and within 5 ft attacks that ally, use your reaction to impose disadvantage on that attack.' },
      std(5, 'Extra Attack', { actionEconomy: 'PASSIVE', rulesMd: '2 attacks at 5, 3 at 11, 4 at 20.' }),
      { level: 7, name: 'Intercept', actionEconomy: 'REACTION', uses: [[7, 'PB']], recovery: 'LONG_REST', rulesMd: 'Reaction when a creature within 5 ft takes attack damage: reduce it by 1d10 + PB. PB uses per long rest.' },
      std(9, 'Indomitable', { uses: [[9, 1], [13, 2], [17, 3]], recovery: 'LONG_REST' }),
      { level: 10, name: 'Defensive Formation', actionEconomy: 'PASSIVE', rulesMd: 'With a shield, allies within 5 ft gain +1 AC against ranged attacks while you are not incapacitated.' },
      { level: 15, name: 'Last Line', actionEconomy: 'PASSIVE', uses: [[15, 1]], recovery: 'LONG_REST', rulesMd: 'Once per long rest, if reduced to 0 HP but not killed outright, remain at 1 HP.' },
      { level: 18, name: 'Fortress', actionEconomy: 'PASSIVE', rulesMd: 'Guard Stance ally may be within 10 ft; you must still be within 5 ft of the attacker.' },
      ...asi(4, 6, 8, 12, 14, 16, 19),
    ]),
  cls('shade', 'Shade', 8, 'DEX', 'DEX / INT', 'Sneak, investigate, disable security. Skill-heavy tactical.',
    'Rogue armor, weapons and tools; four Rogue skills. Rogue chassis with published Sneak Attack progression.', [
      std(1, 'Expertise', { actionEconomy: 'PASSIVE' }),
      std(1, 'Sneak Attack', { actionEconomy: 'PASSIVE' }),
      std(2, 'Cunning Action', { actionEconomy: 'BONUS' }),
      { level: 3, name: 'Ghost Route', uses: [[3, 1]], recovery: 'SHORT_REST', rulesMd: 'Once per short or long rest: if you began your turn in cover or obscurity, your Dash movement this turn provokes no opportunity attacks.' },
      std(5, 'Uncanny Dodge', { actionEconomy: 'REACTION' }),
      std(7, 'Evasion', { actionEconomy: 'PASSIVE' }),
      { level: 7, name: 'Silent Entry', actionEconomy: 'PASSIVE', rulesMd: 'Advantage on DEX checks to quietly unlock or disable mundane security.' },
      { level: 9, name: 'False Identity', actionEconomy: 'PASSIVE', rulesMd: 'Seven days and suitable resources establish a credible civilian cover; it does not defeat all scrutiny.' },
      std(11, 'Reliable Talent', { actionEconomy: 'PASSIVE' }),
      { level: 13, name: 'Vanishing Act', rulesMd: 'After a Cunning Action Hide, move 10 ft while still concealed without revealing your location, if concealment holds.' },
      std(14, 'Blindsense', { actionEconomy: 'PASSIVE' }),
      std(15, 'Slippery Mind', { actionEconomy: 'PASSIVE' }),
      { level: 17, name: 'Perfect Infiltration', uses: [[17, 1]], recovery: 'LONG_REST', rulesMd: 'Once per long rest, a failed Stealth, Sleight of Hand or thieves\' tools check treats the d20 as 15.' },
      std(18, 'Elusive', { actionEconomy: 'PASSIVE' }),
      std(20, 'Stroke of Luck', { uses: [[20, 1]], recovery: 'SHORT_REST' }),
      ...asi(4, 8, 10, 12, 16, 19),
    ]),
  cls('machinist', 'Machinist', 8, 'INT', 'INT / CON', 'Build, repair, scan, improvise devices. Tactical support and problem-solving.',
    'Light and medium armor, shields, simple weapons, hand crossbows. Tinker\'s tools, thieves\' tools, one artisan tool. Two of Investigation, Arcana, Perception, History, Medicine, Sleight of Hand.', [
      { level: 1, name: 'Field Rig', actionEconomy: 'PASSIVE', rulesMd: 'Choose two different devices at the end of a long rest (three at level 9, four at 15). Each has PB activations per long rest, tracked separately. Device attack = INT + PB; save DC = 8 + INT + PB. This is technical equipment, not a pool of spell slots.' },
      { level: 1, name: 'Technical Expertise', actionEconomy: 'PASSIVE', rulesMd: 'Double PB for one selected tool.' },
      { level: 2, name: 'Jury-Rig', actionEconomy: 'ACTION', uses: [[2, 1]], recovery: 'SHORT_REST', rulesMd: 'Once per short rest, action and tools: temporarily restore a small mundane device for 10 minutes. No instant repairs of major city machinery.' },
      { level: 3, name: 'Engineering Specialty', actionEconomy: 'PASSIVE', rulesMd: 'Bulwark (+1 AC with shield), Saboteur (Stealth proficiency or Expertise), or Systems Engineer (Investigation/Arcana Expertise).' },
      std(5, 'Extra Attack', { actionEconomy: 'PASSIVE' }),
      { level: 6, name: 'Improved Devices', actionEconomy: 'PASSIVE', rulesMd: 'Repair Injector 2d8 + INT; Shock Projector 2d8.' },
      { level: 7, name: 'Emergency Repair', actionEconomy: 'REACTION', rulesMd: 'Reaction within 5 ft when a device or construct would cease functioning: spend one Field Rig activation to prolong it to the end of the next turn.' },
      { level: 9, name: 'Third Prepared Device', actionEconomy: 'PASSIVE', rulesMd: 'Prepare three different devices.' },
      { level: 10, name: 'Advanced Rig', actionEconomy: 'PASSIVE', rulesMd: '+10 ft to eligible device ranges; Deflection Emitter +3 AC.' },
      { level: 11, name: 'Precision Engineering', actionEconomy: 'PASSIVE', rulesMd: 'Once per turn, +1d8 on a hit with a weapon or Shock Projector.' },
      { level: 13, name: 'Emergency Override', uses: [[13, 1]], recovery: 'LONG_REST', rulesMd: 'Once per long rest, automatic success on one possible, non-hostile mundane-machine operation check with DC 20 or less. Cannot automatically solve major plot machinery.' },
      { level: 14, name: 'Reinforced Systems', actionEconomy: 'PASSIVE', rulesMd: 'Lightning resistance while equipped with your rig.' },
      { level: 15, name: 'Fourth Prepared Device', actionEconomy: 'PASSIVE', rulesMd: 'Prepare four different devices.' },
      { level: 17, name: 'Master Engineer', uses: [[17, 1]], recovery: 'SHORT_REST', rulesMd: 'Repair Injector 3d8 + INT, Shock Projector 3d8. Once per short rest, activate a device that normally requires an action as a bonus action.' },
      { level: 18, name: 'Redundant Systems', actionEconomy: 'BONUS', uses: [[18, 1]], recovery: 'LONG_REST', rulesMd: 'Once per long rest, restore a disabled prepared device as a bonus action.' },
      { level: 20, name: 'Grand Architect', actionEconomy: 'PASSIVE', rulesMd: 'Each short rest restores one use per prepared device (apply manually).' },
      ...asi(4, 8, 12, 16, 19),
    ]),
  cls('resonant', 'Resonant', 6, 'INT', 'INT / WIS', 'Cast learned Resonance Patterns. Resource management and magic.',
    'Wizard weapon set, no armor by default. Two of Arcana, History, Investigation, Insight, Medicine, Religion (as cultural studies). Must be Attuned to one discipline. Casting ability INT; spell attack INT + PB; save DC 8 + INT + PB.', [
      { level: 1, name: 'Patterncasting', actionEconomy: 'PASSIVE', rulesMd: 'Cast Patterns from your one discipline using Resonance Points (RP), never spell slots. Requires your Anchor.' },
      { level: 1, name: 'Patternbook', actionEconomy: 'PASSIVE', rulesMd: 'Six 1st-level Patterns at level 1, plus two legal new Patterns each Resonant level. Prepare Resonant level + INT modifier (minimum 1). At level 3: 10 Patterns, max Pattern level 2, 14 RP, three cantrips.' },
      { level: 2, name: 'Resonance Focus', id: 'resonant:focus', uses: [[2, 1]], recovery: 'LONG_REST', rulesMd: 'Once per long rest, reduce the RP cost of a level 1-3 Pattern by 1 (minimum 1).' },
      { level: 3, name: 'Pattern Analysis', actionEconomy: 'PASSIVE', rulesMd: 'Arcana proficiency or Expertise for matters involving your own discipline.' },
      { level: 5, name: 'Deep Attunement', uses: [[5, 1]], recovery: 'LONG_REST', rulesMd: 'Once per long rest, reroll a failed concentration save.' },
      { level: 6, name: 'Discipline Technique', actionEconomy: 'PASSIVE', rulesMd: 'Discipline-specific ability at levels 6, 10 and 14 (see the technique table in the Player Guide).' },
      { level: 7, name: 'Resonant Perception', actionEconomy: 'ACTION', uses: [[7, 'PB']], recovery: 'LONG_REST', rulesMd: 'Action: sense active Resonance within 30 ft until the end of your next turn. PB per long rest. Blocked by total cover unless the effect extends through it.' },
      { level: 9, name: 'Efficient Channeling', uses: [[9, 1]], recovery: 'LONG_REST', rulesMd: 'Once per long rest, reduce a level 1-5 Pattern\'s cost by 2 RP (minimum 1).' },
      { level: 10, name: 'Discipline Mastery', actionEconomy: 'PASSIVE', rulesMd: 'Level 10 discipline technique.' },
      { level: 11, name: 'Advanced Weaving', actionEconomy: 'PASSIVE', rulesMd: 'Advantage on Pattern research checks in a suitable lab or archive.' },
      { level: 13, name: 'Harmonic Awareness', actionEconomy: 'PASSIVE', rulesMd: 'Advantage to identify localized Resonance instability; not automatic cleansing.' },
      { level: 14, name: 'Discipline Apex', actionEconomy: 'PASSIVE', rulesMd: 'Level 14 discipline technique.' },
      { level: 15, name: 'Controlled Strain', uses: [[15, 1]], recovery: 'LONG_REST', rulesMd: 'Once per long rest, reduce Amplified Overcasting damage by 1d6 (minimum 0).' },
      { level: 17, name: '9th-level Patterns', actionEconomy: 'PASSIVE', rulesMd: '9th-level Patterns become accessible.' },
      { level: 18, name: 'Pattern Mastery', uses: [[18, 2]], recovery: 'LONG_REST', rulesMd: 'Once per long rest each: cast one selected 1st-level and one selected 2nd-level Pattern free at base level.' },
      { level: 20, name: 'Signature Patterns', uses: [[20, 2]], recovery: 'LONG_REST', rulesMd: 'Once per long rest each: cast two selected 3rd-level Patterns free at base level.' },
      ...asi(4, 8, 12, 16, 19),
    ]),
  cls('votary', 'Votary', 8, 'WIS', 'WIS / CHA', 'Heal, rally, organize, negotiate. Support and social. Nonmagical field medic.',
    'Light armor, simple weapons, healer\'s kit. Three of Medicine, Insight, Persuasion, Investigation, History, Survival, Perception.', [
      { level: 1, name: 'Medical Training', actionEconomy: 'PASSIVE', rulesMd: 'Medicine Expertise.' },
      { level: 1, name: 'Field Treatment', id: 'votary:field-treatment', actionEconomy: 'ACTION', uses: [[1, 'PB']], recovery: 'LONG_REST', alsoConsumes: [{ key: 'healer-kit', amount: 1 }], rulesMd: 'Action, adjacent target with at least 1 HP: consume one healer\'s-kit charge AND one use, heal 1d6 + WIS (2d6 at level 5, 3d6 at 14). Cannot affect constructs. Stabilize a downed creature first.' },
      { level: 2, name: 'Rally', actionEconomy: 'BONUS', uses: [[2, 'PB']], recovery: 'LONG_REST', rulesMd: 'Bonus action: one ally within 30 ft who can hear you gains 1d6 + WIS temporary HP (2d6 at level 11). Temp HP does not stack.' },
      { level: 3, name: 'Calling', actionEconomy: 'PASSIVE', rulesMd: 'Lifesaver (a creature you stabilize rises to 1 HP, once per creature per short rest), Orator (Persuasion proficiency/Expertise; Rally range 60 ft), or Caretaker (up to six creatures spending Hit Dice during a rest heal +1d4 each).' },
      { level: 5, name: 'Improved Treatment', actionEconomy: 'PASSIVE', rulesMd: 'Field Treatment heals 2d6 + WIS.' },
      { level: 6, name: 'Steady Hands', actionEconomy: 'BONUS', uses: [[6, 1]], recovery: 'SHORT_REST', rulesMd: 'Once per short rest, use Field Treatment as a bonus action.' },
      { level: 7, name: 'Protective Counsel', actionEconomy: 'REACTION', uses: [[7, 'PB']], recovery: 'LONG_REST', rulesMd: 'Reaction when an ally within 30 ft rolls a fear or charm save: add 1d4 before the outcome. PB per long rest.' },
      { level: 9, name: 'Emergency Triage', actionEconomy: 'ACTION', uses: [[9, 1]], recovery: 'LONG_REST', alsoConsumes: [{ key: 'healer-kit', amount: 2 }], rulesMd: 'Once per long rest, action and two healer-kit charges: raise a target at 0 HP to 3d6 + WIS HP. Exception to stabilize-first.' },
      { level: 10, name: 'Calling Improvement', actionEconomy: 'PASSIVE', rulesMd: 'Lifesaver +1d6 Treatment; Orator Rally two targets per use; Caretaker short-rest bonus 1d8.' },
      { level: 11, name: 'Inspiring Recovery', actionEconomy: 'PASSIVE', rulesMd: 'Rally grants 2d6 + WIS temporary HP.' },
      { level: 13, name: 'Refuse Despair', uses: [[13, 1]], recovery: 'LONG_REST', rulesMd: 'Once per long rest, reroll a failed WIS save.' },
      { level: 14, name: 'Advanced Medicine', actionEconomy: 'PASSIVE', rulesMd: 'Treatment 3d6 + WIS; can manage poison/disease symptoms given time and materials, not supernatural cures.' },
      { level: 15, name: 'Shelterkeeper', actionEconomy: 'PASSIVE', rulesMd: 'During a short rest, up to six wards gain temp HP = WIS + PB.' },
      { level: 17, name: 'Mass Triage', actionEconomy: 'ACTION', uses: [[17, 1]], recovery: 'LONG_REST', rulesMd: 'Once per long rest, action: up to three targets within 15 ft. Spend one Field Treatment use and one healer-kit charge PER target (three charges must be available to start). No free resource duplication - spend those manually.' },
      { level: 18, name: 'Unbroken Resolve', actionEconomy: 'PASSIVE', rulesMd: 'Advantage against frightened.' },
      { level: 20, name: 'Beacon of Humanity', actionEconomy: 'ACTION', uses: [[20, 1]], recovery: 'LONG_REST', rulesMd: 'Once per long rest, action: six allies within 30 ft gain 15 temp HP and end frightened.' },
      ...asi(4, 8, 12, 16, 19),
    ]),
  cls('strider', 'Strider', 10, 'DEX or WIS', 'STR / DEX', 'Explore, track, survive, fight. A nonspellcasting scout.',
    'Light and medium armor, shields, simple and martial weapons. Three of Survival, Nature, Perception, Athletics, Acrobatics, Investigation, Animal Handling, Stealth.', [
      { level: 1, name: 'Coldwise', actionEconomy: 'PASSIVE', rulesMd: 'Advantage on Survival in frozen terrain; tolerate environmental cold as if properly dressed. NOT resistance to cold damage.' },
      { level: 1, name: 'Tracker', actionEconomy: 'PASSIVE', rulesMd: 'Expertise in Survival or Perception.' },
      { level: 2, name: 'Fighting Style', actionEconomy: 'PASSIVE', rulesMd: 'Archery, Defense, Dueling or Two-Weapon Fighting.' },
      { level: 3, name: 'Trailcraft', uses: [[3, 1]], recovery: 'SHORT_REST', rulesMd: 'Once per short or long rest, lead up to five others for 1 hour (2 hours at level 14) at normal or slower pace without leaving ordinary tracks.' },
      { level: 3, name: 'Expedition Specialty', actionEconomy: 'PASSIVE', rulesMd: 'Hunter (+1d4 weapon damage once per turn to an enemy you already hit this turn), Pathfinder (group overland speed +10% when possible), or Scavenger (Investigation or thieves\' tools Expertise plus mundane-device identification after ten minutes).' },
      std(5, 'Extra Attack', { actionEconomy: 'PASSIVE' }),
      { level: 6, name: 'Surefooted', actionEconomy: 'PASSIVE', rulesMd: 'Ignore nonmagical difficult terrain due to snow or ice.' },
      { level: 7, name: 'Ambush Sense', actionEconomy: 'PASSIVE', rulesMd: 'Add WIS modifier (minimum +1) to initiative.' },
      { level: 9, name: 'Relentless March', actionEconomy: 'PASSIVE', rulesMd: 'Lead up to five companions; advantage on CON saves against exhaustion from forced marches.' },
      { level: 10, name: 'Specialty Improvement', actionEconomy: 'PASSIVE', rulesMd: 'Hunter damage 1d6; Pathfinder ignores the first hour of difficult-travel penalties; Scavenger advantage on mundane trap-disarm and salvage checks.' },
      { level: 11, name: 'Precision Strike', actionEconomy: 'PASSIVE', rulesMd: 'Once per turn, +1d8 weapon damage on a hit.' },
      { level: 13, name: 'Whiteout Hunter', actionEconomy: 'PASSIVE', rulesMd: 'May Hide when lightly obscured by natural snow or mist.' },
      { level: 14, name: 'Unseen Passage', actionEconomy: 'PASSIVE', rulesMd: 'Trailcraft lasts 2 hours.' },
      { level: 15, name: 'Survival Instinct', actionEconomy: 'REACTION', uses: [[15, 1]], recovery: 'SHORT_REST', rulesMd: 'Reaction: halve the damage of a visible attack that hits you. Once per short or long rest.' },
      { level: 17, name: 'Veteran Explorer', actionEconomy: 'PASSIVE', rulesMd: 'Gain CON save proficiency.' },
      { level: 18, name: 'Predator\'s Awareness', actionEconomy: 'PASSIVE', rulesMd: 'Detect the location of creatures within 10 ft without total cover, unless magically concealed.' },
      { level: 20, name: 'Master of the Wastes', uses: [[20, 1]], recovery: 'LONG_REST', rulesMd: 'Once per long rest, for 1 minute: advantage on weapon attacks against enemies that attacked you since the start of your previous turn.' },
      ...asi(4, 8, 12, 16, 19),
    ]),
];

const SKILL_CHOICES: Record<string, { count: number; from: string[] }> = {
  warden: { count: 2, from: ['Athletics', 'Acrobatics', 'Intimidation', 'Insight', 'Perception', 'Survival'] },
  shade: { count: 4, from: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'] },
  machinist: { count: 2, from: ['Investigation', 'Arcana', 'Perception', 'History', 'Medicine', 'Sleight of Hand'] },
  resonant: { count: 2, from: ['Arcana', 'History', 'Investigation', 'Insight', 'Medicine', 'Religion'] },
  votary: { count: 3, from: ['Medicine', 'Insight', 'Persuasion', 'Investigation', 'History', 'Survival', 'Perception'] },
  strider: { count: 3, from: ['Survival', 'Nature', 'Perception', 'Athletics', 'Acrobatics', 'Investigation', 'Animal Handling', 'Stealth'] },
};
const LOADOUTS: Record<string, string> = {
  warden: 'Shield, one melee weapon, one ranged option, medium armor or reinforced coat, survival pack.',
  shade: "Reinforced coat, two light weapons, thieves' tools, rope, one disguise kit or forgery kit.",
  machinist: 'Medium armor, toolkit, Field Rig with two prepared devices, simple weapon, spare parts pouch.',
  resonant: 'Anchor, Patternbook, light crossbow or quarterstaff, research instruments, insulated clothes.',
  votary: "Reinforced coat, 10-use healer's kit, medical satchel, simple weapon, shelter supplies.",
  strider: 'Medium armor or reinforced coat, bow or spear, climbing gear, snow goggles, survival pack.',
};
for (const c of CLASSES) {
  c.skillChoices = SKILL_CHOICES[c.id];
  c.loadoutMd = LOADOUTS[c.id];
}
export const COMMON_GEAR = 'Cold-weather clothing, 3 days of rations, basic water supply, a district ID or reasonable substitute, and 20 credits.';

export const DEVICES: DeviceDefinition[] = [
  { id: 'repair-injector', name: 'Repair Injector', actionEconomy: 'ACTION', actionText: 'Action, adjacent', effectMd: 'Restore 1d8 + INT HP to a construct or repair a small mundane object. NOT living creatures. (2d8 at level 6, 3d8 at 17.)' },
  { id: 'pulse-scanner', name: 'Pulse Scanner', actionEconomy: 'ACTION', actionText: 'Action', effectMd: 'Detect nearby active Resonance technology within 30 ft for up to 1 minute. Requires concentration.' },
  { id: 'deflection-emitter', name: 'Deflection Emitter', actionEconomy: 'REACTION', actionText: 'Reaction', effectMd: '+2 AC against one triggering attack on you or an ally within 10 ft; choose before the hit is resolved. (+3 at level 10.)' },
  { id: 'shock-projector', name: 'Shock Projector', actionEconomy: 'REPLACES_ATTACK', actionText: 'Replaces ONE attack in your Attack action', effectMd: 'Ranged device attack, 30 ft, 1d8 lightning (2d8 at level 6, 3d8 at 17). Never a free extra action.' },
  { id: 'stabilizer', name: 'Stabilizer', actionEconomy: 'ACTION', actionText: 'Action, adjacent', effectMd: 'Target has advantage on its next CON save before the end of your next turn.' },
];

export const classById = (id: string) => CLASSES.find((c) => c.id === id);
export const deviceSlots = (level: number) => (level >= 15 ? 4 : level >= 9 ? 3 : 2);
