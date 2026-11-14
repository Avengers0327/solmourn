// DM-ONLY seed bundle: the preloaded Solmourn campaign. Imported dynamically so it ships as
// its own chunk, separate from player-facing code. NOTE: anyone who can load the hosted app can
// download this chunk - host the DM build privately (see README).
import bibleMd from '../../content/SOLMOURN_CANONICAL_DM_STORY_BIBLE.md?raw';
import playerGuideMd from '../../02_PLAYER_GUIDE.md?raw';
import amendmentMd from '../../content/01_DIVERGENCE_CANON_AMENDMENT.md?raw';
import playerSpeciesMd from '../../content/02_PLAYER_SPECIES_AND_CHARACTER_CREATION.md?raw';
import { buildSeedFrom } from './build';

export const buildSeed = () => buildSeedFrom({ bible: bibleMd, playerGuide: playerGuideMd, amendment: amendmentMd, playerSpecies: playerSpeciesMd });
