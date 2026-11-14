// Pure filtering for the Pattern directory (used by the UI and tested directly).
import { playerVisible } from '../content/spells';
import { canAddToBook } from './rules';
import { isKnown, isPrepared } from '../data/patternActions';
import type { PC, Pattern } from './types';

export interface SpellCriteria {
  q?: string;
  discipline?: string;
  level?: string;
  school?: string;
  book?: string;
  verification?: string;
  availability?: 'ALL' | 'MAPPED' | 'EXCLUDED';
  favoritesOnly?: boolean;
  favorites?: string[];
  character?: PC;
  mine?: 'ALL' | 'LEGAL' | 'KNOWN' | 'PREPARED';
  playerView?: boolean;
}

export function filterSpells(all: Pattern[], c: SpellCriteria): Pattern[] {
  const pool = c.playerView ? playerVisible(all) : all;
  const needle = (c.q ?? '').trim().toLowerCase();
  const all_ = (v?: string) => !v || v === 'ALL';
  return pool.filter((p) =>
    (all_(c.discipline) || p.discipline === c.discipline) &&
    (all_(c.level) || p.level === Number(c.level)) &&
    (all_(c.school) || p.school === c.school) &&
    (all_(c.book) || !!p.sources?.includes(c.book!)) &&
    (all_(c.verification) || p.verification === c.verification) &&
    (!c.availability || c.availability === 'ALL' || p.status === c.availability) &&
    (!c.favoritesOnly || !!c.favorites?.includes(p.id)) &&
    (!c.mine || c.mine === 'ALL' || (!!c.character && (c.mine === 'LEGAL' ? p.status === 'MAPPED' && canAddToBook(c.character, p).ok : c.mine === 'KNOWN' ? isKnown(c.character, p) : isPrepared(c.character, p)))) &&
    (!needle || p.name.toLowerCase().includes(needle) || (p.publishedName ?? '').toLowerCase().includes(needle)));
}
