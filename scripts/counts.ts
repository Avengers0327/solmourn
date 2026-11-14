// Prints content counts for the status report.
import { readFileSync } from 'node:fs';
import { SPELLS } from '../src/content/spells';
import { buildSeedFrom } from '../src/seed/build';

const seed = buildSeedFrom({ bible: readFileSync('content/SOLMOURN_CANONICAL_DM_STORY_BIBLE.md', 'utf8'), playerGuide: readFileSync('02_PLAYER_GUIDE.md', 'utf8'), amendment: readFileSync('content/01_DIVERGENCE_CANON_AMENDMENT.md', 'utf8'), playerSpecies: readFileSync('content/02_PLAYER_SPECIES_AND_CHARACTER_CREATION.md', 'utf8') });
const t = seed.tables as Record<string, { id: string }[]>;
console.log(Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.length])));
console.log('bible lore', t.lore.filter((l) => l.id.startsWith('bible-')).length);
console.log('spells', SPELLS.length, 'published', SPELLS.filter((s) => s.origin !== 'ORIGINAL').length, 'excluded', SPELLS.filter((s) => s.status === 'EXCLUDED').length, 'renamed', SPELLS.filter((s) => s.publishedName).length);
