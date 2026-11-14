// Builds the current seed bundle from the files on disk (tests and scripts; no bundler needed).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSeedFrom } from '../../src/seed/build';
import type { CampaignData } from '../../src/domain/safe';

export const readBible = () => readFileSync(resolve(process.cwd(), 'content/SOLMOURN_CANONICAL_DM_STORY_BIBLE.md'), 'utf8');
export const readPlayerGuide = () => readFileSync(resolve(process.cwd(), '02_PLAYER_GUIDE.md'), 'utf8');
const read = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8');
export const seedV2 = () => buildSeedFrom({ bible: readBible(), playerGuide: readPlayerGuide(), amendment: read('content/01_DIVERGENCE_CANON_AMENDMENT.md'), playerSpecies: read('content/02_PLAYER_SPECIES_AND_CHARACTER_CREATION.md') });

/** A fresh, untouched campaign as plain data. */
export function freshData(): CampaignData & Record<string, Record<string, unknown>[]> {
  const t = structuredClone(seedV2().tables) as unknown as Record<string, Record<string, unknown>[]>;
  return { ...t, events: [], pcs: [] } as never;
}
