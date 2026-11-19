// Assembles the DM-only seed bundle from the two source documents (no bundler-specific imports,
// so scripts and tests can call it directly).
import { CAMPAIGN_ID } from '../domain/types';
import type { Campaign, Doc } from '../domain/types';
import { buildCharacterGuideMd } from '../content/charGuide';
import type { SeedBundle } from '../data/seedEngine';
import { SEED_VERSION } from '../seedVersion';
import { lessons, statCards } from './academy';
import baselineV1 from './baselineV1.json';
import { branches, clues, revelations, scenes, sessions } from './campaign';
import { calendarLore, workerNpcs } from './chronology';
import { AMENDMENT_FILE, BIBLE_FILE, amendmentToLore, base, bibleToLore } from './helpers';
import { authoredLore, canonDecisions, canonRules, clocks, locations, npcs, timeline, trialConfig } from './world';

export function buildSeedFrom(docs: { bible: string; playerGuide: string; amendment: string; playerSpecies: string }): SeedBundle {
  const campaign: Campaign = { ...base(CAMPAIGN_ID, BIBLE_FILE, 'LOCKED'), title: 'Solmourn: The Dying Light', edition: '5e-2014', currentSessionId: 'ses-1', settings: {} };
  const doc = (id: string, title: string, fileName: string, bodyMd: string, visibility: Doc['visibility']): Doc => ({ ...base(id, fileName), title, fileName, bodyMd, visibility });
  const docsOut: Doc[] = [
    doc('doc-bible', 'Canonical DM Story Bible', BIBLE_FILE, docs.bible, 'DM_ONLY'),
    doc('doc-char-guide', 'Character Creation Guide', 'CHARACTER_CREATION_GUIDE.md (generated)', buildCharacterGuideMd(), 'PLAYER_SAFE'),
    doc('doc-amendment-001', 'Canon Amendment 001: the Divergence', AMENDMENT_FILE, docs.amendment, 'DM_ONLY'),
    doc('doc-player-species', 'Player Species & Character Creation (Divergence edition)', '02_PLAYER_SPECIES_AND_CHARACTER_CREATION.md', docs.playerSpecies, 'PLAYER_SAFE'),
    doc('doc-02', 'Player Guide (playtest rules v1.0)', '02_PLAYER_GUIDE.md', `> **Partly superseded:** this guide says all characters are human. Any official D&D species is now allowed: see the Character Creation Guide. Its class and Resonance rules remain the playtest reference.\n\n${docs.playerGuide}`, 'PLAYER_SAFE'),
  ];
  return {
    version: SEED_VERSION,
    legacyBaseline: baselineV1 as Record<string, string>,
    meta: [{ key: 'trialConfig', value: trialConfig }],
    tables: {
      campaigns: [campaign], sessions, scenes, npcs: [...npcs, ...workerNpcs], locations, lore: [...bibleToLore(docs.bible), ...amendmentToLore(docs.amendment), ...authoredLore, calendarLore], revelations, clues, clocks,
      canonDecisions, timeline, docs: docsOut, canonRules, branches, lessons, statCards,
    },
  };
}
