// Spoiler-safe Character Creation Guide, generated from the same class and rules data the
// app uses, so the Markdown and the in-app walkthrough cannot drift apart.
import { CLASSES, COMMON_GEAR, DEVICES } from './classes';
import { AMP_TIERS, BACKGROUNDS, DISCIPLINES, POINT_BUY_BUDGET, POINT_BUY_COST, RP_COST, RP_POOL, STANDARD_ARRAY } from './rules';
import { PATTERNS } from './spells';
import { SPECIES, SPECIES_ATTRIBUTION, speciesCoverage } from './species';
import { hpAtLevel } from '../domain/creation';
import { featureUses, maxPatternLevel } from '../domain/rules';

const RING_OF: Record<string, string> = { 'Crown Scion': 'Crown', 'Gilded Citizen': 'Gilded Ring', 'Ward Resident': 'Inner Wards', 'Foundry Worker': 'Foundries', 'Frostward Survivor': 'Frostward' };
const CONTRIBUTE: Record<string, string> = {
  warden: 'Hold a doorway while others work; protect a rescuer; stand between a crowd and a cordon.',
  shade: 'Get into the sealed place; find the hatch nobody else saw; lift the document; scout ahead unseen.',
  machinist: 'Read the gauges, restart the pump, shut down the drone, tell everyone what the machine is about to do.',
  resonant: 'Sense what the field is doing, solve a problem with one well-chosen Pattern, and decide when the cost of more power is worth it.',
  votary: 'Keep the hurt alive, calm a frightened crowd, organize an evacuation, speak for people who are not being heard.',
  strider: 'Find the route, read the cold, track who went where, strike from range, get the group home.',
};

export function buildCharacterGuideMd(): string {
  const out: string[] = [];
  out.push('# Solmourn: The Dying Light — Character Creation Guide',
    '> **Safe to share with players.** Rules are D&D 5e (2014) with Solmourn homebrew. The six classes and Resonance rules are a **playtest**: the DM may adjust them between sessions, openly.',
    '## The short version',
    'You live in Solmourn, a megacity of 54 million people warmed by the Everflame, an artificial sun. You may be **any official D&D species**. You start at **level 3**. The first session opens in **Frostward**, the crowded outer ring, when the heat fails.',
    'You do not need to know any secret history to make a character. Finding things out is the game.',
    '## Step by step',
    '1. **Species.** Any official D&D species, 2014-era rules. Tell the DM the book and version. Use that one source\'s rules: never mix two versions or stack two species. For mixed heritage, pick one species\' rules and describe the rest.',
    `2. **Ability scores.** Standard array **${STANDARD_ARRAY.join(', ')}**, or point buy with **${POINT_BUY_BUDGET} points** (${Object.entries(POINT_BUY_COST).map(([s, c]) => `${s} costs ${c}`).join(', ')}; scores 8-15 before bonuses).`,
    '3. **Class.** One of the six below.',
    '4. **Background and ring.** Two skills from your background. Your ring of birth and where you live now can differ.',
    '5. **Class skills.** Choose from your class list; you cannot pick a skill your background already gave you.',
    '6. **Attunement.** Attuned to one Resonance discipline, or Unattuned. About one person in a thousand is Attuned. Only the **Resonant** class casts; being Attuned without training gives no Patterns.',
    '7. **Numbers.** Proficiency bonus is **+2** at level 3. Ability modifier = (score − 10) ÷ 2, rounded down. Hit points: full hit die at level 1, then half the die + 1 for each further level, plus your Constitution modifier per level.',
    `8. **Equipment.** Your class loadout plus: ${COMMON_GEAR}`,
    '9. **Who you are.** One goal, one person you care about, one secret (tell only the DM), **one reason you are in Frostward when the lights go out**, and **one existing connection to another PC**.',
    '### Example', 'Rin is a dwarf Machinist 3 from the Foundries, once disciplined for bypassing an energy meter. She wants to stop heat cuts in the outer ring, has a cousin in the Inner Wards, and knows the party\'s Warden from a factory accident. She is in Frostward delivering spare parts.',
    '## Species and the Divergence',
    'Many peoples live in Solmourn. All of them descend from Earth\'s humanity, changed over centuries by biotechnology, Resonance-altered heredity and synthetic engineering. This long history is called **the Divergence**. Your species keeps its published game traits; only the story behind them is told the Solmourn way. Fantasy gods, other planes and fantasy kingdoms are not part of this setting. Species never decides class, district, personality or loyalty.',
    '- **Flying, swimming and climbing species:** use your printed speeds. Solmourn has narrow corridors, sealed tunnels and tall open shafts.',
    '- **Constructed species:** you are a person, not property.',
    '- **Shapechangers:** your printed powers work, but do not automatically defeat every security system.',
    '- **Species with innate spells:** those are limited species features with their printed uses. They do not make you a Resonant and never use or grant Resonance Points.',
    (() => { const c = speciesCoverage(); return `**In the app:** ${c.implemented} species have their rules built in (from the SRD). ${c.sourceNeeded} more official species can be chosen and entered from your own book, with the DM checking them. 2024 revisions are not used: the campaign is on 2014 rules.`; })(),
    '**Built in:** ' + SPECIES.filter((x) => x.status === 'IMPLEMENTED').map((x) => x.name).join(', ') + '.',
    '**From your book (bring it):** ' + [...new Set(SPECIES.filter((x) => x.status === 'SOURCE_NEEDED' && x.id !== 'other-official').map((x) => x.name))].join(', ') + ', or another official species. The list was compiled from memory; your DM confirms the book.',
    '## Backgrounds by ring',
    ...BACKGROUNDS.map((b) => `- **${b.name}** (${RING_OF[b.name]}): ${b.skills}. ${b.perk}.`),
    'Choose two tool or language proficiencies with your DM. Your background does not decide your loyalties. Nobody has to support the Imperium, and nobody has to oppose it.',
    '## The six disciplines', ...DISCIPLINES.map((d) => `- **${d.name}:** ${d.domain}`),
    'Resonance is licensed in the inner rings and policed everywhere. Casting where the wrong people can see it has consequences.',
    '## Classes');
  for (const c of CLASSES) {
    const l3 = c.features.filter((f) => f.level <= 3 && f.name !== 'ASI').sort((a, b) => a.level - b.level);
    out.push(`### ${c.name}`,
      `*${c.summary}*`,
      `- **Hit die:** d${c.hitDie} · **Main ability:** ${c.mainAbility} · **Saves:** ${c.saves}`,
      `- **Hit points at level 3:** ${hpAtLevel(c.hitDie, 0, 3)} + 3 × Constitution modifier`,
      `- **Proficiencies:** ${c.proficienciesMd}`,
      `- **Class skills:** choose ${c.skillChoices?.count} from ${c.skillChoices?.from.join(', ')}`,
      `- **Starting loadout:** ${c.loadoutMd}`,
      `- **What you do in a scene:** ${CONTRIBUTE[c.id]}`,
      '**Quick-play sheet (level 3)**',
      ...l3.map((f) => {
        const uses = featureUses(f, 3);
        const rec = f.recovery === 'SHORT_REST' ? 'short rest' : 'long rest';
        return `- **${f.name}** (level ${f.level}${f.actionEconomy ? `, ${f.actionEconomy.toLowerCase().replace('_', ' ')}` : ''}${uses ? `, ${uses} use${uses > 1 ? 's' : ''} per ${rec}` : ''}): ${f.rulesMd}`;
      }));
    if (c.id === 'machinist') out.push('**Field Rig devices** (prepare two):', ...DEVICES.map((d) => `- **${d.name}** — *${d.actionText}.* ${d.effectMd}`));
    if (c.id === 'resonant') {
      out.push(`**Casting at level 3:** ${RP_POOL[2]} Resonance Points, Patterns up to level ${maxPatternLevel(3)}, 10 Patterns in your Patternbook, three cantrips. RP cost by Pattern level 0-9: ${RP_COST.join(' / ')}.`,
        `**Amplified Overcasting** (twice per long rest): ${AMP_TIERS.map((t) => `+${t.tier}: +${t.extraRp} RP, ${t.strainDice}d6 strain, CON DC ${t.conDc}`).join('; ')}. One bounded enhancement only.`,
        '**Emergency Overcasting** (once per long rest): borrow up to 2 missing RP; 1d6 damage each; CON save DC 10 + 2 per RP or one exhaustion. Cannot be combined with Amplification.',
        '**Patterns available to you at level 3, by discipline:** ' + DISCIPLINES.map((d) => `${d.name} ${PATTERNS.filter((p) => p.discipline === d.id && p.level <= 2).length}`).join(' · ') + '. Your DM approves your ten.');
    }
    const later = c.features.filter((f) => f.level > 3 && f.name !== 'ASI').sort((a, b) => a.level - b.level);
    out.push(`**Later levels:** ${later.map((f) => `${f.level} ${f.name}`).join(' · ')}. Ability score improvements at ${c.features.filter((f) => f.name === 'ASI').map((f) => f.level).sort((a, b) => a - b).join(', ')}.`);
  }
  out.push('## Playing together',
    '- Make someone who can work with the party even when they disagree.',
    '- Tell the DM your lines (never in the game) and veils (off-screen only). Anyone can ask to pause a scene without saying why.',
    '- You can try anything. The DM will say what your character would plausibly know and whether a roll is needed.',
    '- Keep a short note each session: what we learned, what we want, whom we trust, what we still do not know.',
    '## Character pitch',
    '```text\nName / pronouns:\nClass / level 3:                 Background / ring:\nSpecies + book:                  Attuned (discipline) / Unattuned:\nSTR __ DEX __ CON __ INT __ WIS __ CHA __\nHP __   AC __   Speed __   Proficiency bonus +2\nWhat I do in Solmourn:\nOne person I care about:\nOne thing I want:\nOne secret (DM only):\nWhy I am in Frostward when the lights go out:\nMy link to another PC:\nQuestions for the DM:\n```');
  out.push('## Attribution', SPECIES_ATTRIBUTION);
  return out.join('\n\n') + '\n';
}
