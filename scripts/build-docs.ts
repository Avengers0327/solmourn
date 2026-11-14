// Generates the Markdown deliverables in docs/ from the SAME records the app seeds, so the
// Markdown and the app cannot disagree. Files prefixed DM_ are private; the others are player-safe.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildCharacterGuideMd } from '../src/content/charGuide';
import { DISCIPLINES, disciplineName } from '../src/content/rules';
import { SPELLS, SPELL_INDEX_META, SRD_ATTRIBUTION, VERIFICATION_LABEL, bookSummaries, playerVisible, spellTotals } from '../src/content/spells';
import { buildSeedFrom } from '../src/seed/build';
import type { Branch, Clue, Lesson, Revelation, Scene, Session, StatCard } from '../src/domain/types';

const seed = buildSeedFrom({ bible: readFileSync('content/SOLMOURN_CANONICAL_DM_STORY_BIBLE.md', 'utf8'), playerGuide: readFileSync('02_PLAYER_GUIDE.md', 'utf8'), amendment: readFileSync('content/01_DIVERGENCE_CANON_AMENDMENT.md', 'utf8'), playerSpecies: readFileSync('content/02_PLAYER_SPECIES_AND_CHARACTER_CREATION.md', 'utf8') });
const T = seed.tables as unknown as { sessions: Session[]; scenes: Scene[]; branches: Branch[]; clues: Clue[]; revelations: Revelation[]; lessons: Lesson[]; statCards: StatCard[] };
const DM = '> **DM ONLY — contains campaign spoilers.** Generated from the app seed; edit the seed, not this file.\n';
mkdirSync('docs', { recursive: true });
const out = (name: string, body: string) => { writeFileSync(`docs/${name}`, body); console.log(`docs/${name}  ${(body.length / 1024).toFixed(0)} KB`); };

// ---- 15-session campaign ----
const camp: string[] = ['# Solmourn: The Dying Light — 15-Session Branching Campaign (WORKING prep)', DM,
  'Anchor events are canon (Story Bible §10.2). Session titles, scenes, encounters, clue placement, branches and stat cards are **WORKING** prep to edit. Arc names and level ranges come from the worldbuilding conversation, not the bible. Session numbers are pacing guides.'];
for (const s of T.sessions) {
  camp.push(`## Session ${s.index} — ${s.title}`, `*${s.arc} · suggested level ${s.levelRange}*`, s.questionMd, s.prepMd, '### Scenes');
  for (const sc of T.scenes.filter((x) => x.sessionId === s.id)) camp.push(`**${sc.sequence}. ${sc.title}** — ${sc.descriptionMd}${sc.readAloudMd ? `\n\n> *Read aloud:* ${sc.readAloudMd}` : ''}`);
  const bs = T.branches.filter((b) => b.sessionIndex === s.index);
  if (bs.length) camp.push('### Choices');
  for (const b of bs) camp.push(`**${b.title}** (${b.id}, ${b.canonStatus}) — when: ${b.preconditionMd}\n${b.options.map((o) => `- **${o.label}:** ${o.stateChangesMd} *Later:* ${o.downstreamMd}`).join('\n')}\n- *Recovery:* ${b.recoveryMd}`);
  const cs = T.clues.filter((c) => c.sessionIndex === s.index);
  if (cs.length) camp.push('### Clues', cs.map((c) => `- **${c.id}** ${c.title}${c.required ? ' *(required)*' : ''} → ${c.revelationIds.join(', ')}. Routes: ${c.discoveryRoutes.join('; ')}. *Players get:* ${c.playerTextMd}`).join('\n'));
}
camp.push('## Mysteries');
for (const r of T.revelations) camp.push(`### ${r.title} (${r.id}, ${r.canonStatus})`, `- **Objective truth:** ${r.privateTruthMd}\n- **Prevailing belief:** ${r.prevailingBeliefMd}\n- **Who knows:** ${r.whoKnowsMd}\n- **Earliest reveal:** ${r.earliestRevealMd}\n- **Redundant clues:** ${T.clues.filter((c) => c.revelationIds.includes(r.id)).map((c) => c.id).join(', ')}\n- **Backup:** ${r.backupMd}\n- **Approved public summary:** ${r.playerSafeSummaryMd || '*none yet*'}`);
out('DM_CAMPAIGN_15_SESSIONS.md', camp.join('\n\n') + '\n');

// ---- DM Academy ----
out('DM_ACADEMY.md', ['# Solmourn DM Academy', DM, ...T.lessons.sort((a, b) => a.order - b.order).flatMap((l) => [`## ${l.order}. ${l.title} (${l.minutes} min)`, `*${l.summary}*`, l.bodyMd, `**Rehearsal exercise:** ${l.exerciseMd}`])].join('\n\n') + '\n');

// ---- Stat cards ----
out('DM_STAT_CARDS.md', ['# Solmourn stat cards (PLAYTEST)', DM, 'Original numbers written for this campaign. Not published stat blocks; not balance-tested.',
  ...T.statCards.map((c) => `## ${c.name}\n*${c.tier}*${c.kind === 'HAZARD' ? '' : ` · AC ${c.ac} · HP ${c.hp} · Init ${c.initBonus >= 0 ? '+' : ''}${c.initBonus} · ${c.speed}`}\n\n- **${c.kind === 'HAZARD' ? 'Effect' : 'Attacks'}:** ${c.attacksMd}\n- **${c.kind === 'HAZARD' ? 'Dealing with it' : 'Traits'}:** ${c.traitsMd}\n- **Tactics:** ${c.tacticsMd}\n- **Scaling:** ${c.scalingMd}`)].join('\n\n') + '\n');

// ---- Player-safe: character guide and spell directory ----
out('CHARACTER_CREATION_GUIDE.md', buildCharacterGuideMd());
const PUB = playerVisible(SPELLS);
const tot = spellTotals();
const conflictNames = SPELLS.filter((p) => p.discrepancies?.length).map((p) => p.name).join(', ');
const dir: string[] = ['# Resonance Pattern Directory (PLAYTEST)',
  '> Player-safe. The discipline mapping and exclusions are WORKING proposals awaiting DM approval. RP cost by level 0-9: 0 / 2 / 3 / 5 / 6 / 7 / 9 / 10 / 11 / 13. Unearthed Arcana playtest spells are left out of this player copy.',
  '## What is verified',
  `**${tot.srd} spells are SRD-verified** (official SRD 5.1 text, cross-checked against a second index). **${tot.unverified} other official spells are UNVERIFIED:** their level, school, casting time, range, duration, component letters and book list come from one third-party index (${SPELL_INDEX_META.indexSource}, fetched ${SPELL_INDEX_META.fetchedAt.slice(0, 10)}) and have not been checked against any official book. No rules text is stored for them and page numbers are not recorded: see the book listed. ${tot.original} Patterns are original Solmourn content (playtest).`,
  `A spell printed in several books is one row, counted under each book. Where the two sources disagree the row says so (currently: ${conflictNames}).`,
  '## Coverage by sourcebook',
  '| Code | Book | Scope | Spells | SRD-verified | Unverified | Available | Excluded |\n|---|---|---|---:|---:|---:|---:|---:|\n' + bookSummaries().filter((b) => b.code !== 'UA').map((b) => `| ${b.code} | ${b.title} | ${b.scope} | ${b.total} | ${b.verified} | ${b.unverified} | ${b.mapped} | ${b.excluded} |`).join('\n'),
  "Not inventoried: books that print no new player spells (Mordenkainen, Volo, Van Richten, Eberron, Theros, most adventure books). The index credits only some reprints to the Elemental Evil Player's Companion and the Sword Coast guide, so those counts are lower than the printed books."];
for (const d of DISCIPLINES) {
  dir.push(`## ${d.name}`, `*${d.domain}*`, '| Pattern | Published as | Lvl | School | RP | Casting time | Range | Duration | Conc. | Books | Verification |\n|---|---|---:|---|---:|---|---|---|---|---|---|\n' +
    PUB.filter((p) => p.discipline === d.id && p.status === 'MAPPED').map((p) => `| ${p.name} | ${p.publishedName ?? ''} | ${p.level} | ${p.school} | ${p.rpCost} | ${p.action} | ${p.range} | ${p.duration} | ${p.concentration ? 'yes' : ''} | ${(p.sources ?? []).join('/')} | ${VERIFICATION_LABEL[p.verification!]} |`).join('\n'));
}
dir.push('## Mappings that are judgement calls', PUB.filter((p) => p.ambiguous).map((p) => `- **${p.name}** → ${disciplineName(p.discipline)}. ${p.mappingNote}`).join('\n'),
  '## Not available as Patterns (WORKING rulings)', PUB.filter((p) => p.status === 'EXCLUDED').map((p) => `- **${p.name}** (level ${p.level}, ${(p.sources ?? []).join('/')}): ${p.excludedReason}`).join('\n'),
  '## Attribution', SRD_ATTRIBUTION);
out('SPELL_DIRECTORY.md', dir.join('\n\n') + '\n');
