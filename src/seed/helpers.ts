// Shared helpers for the DM-only seed. Everything under src/seed/ is loaded as a separate
// lazy chunk and never imported by player-facing code.
import { CAMPAIGN_ID, type CanonStatus, type LoreEntry } from '../domain/types';

export const BIBLE_FILE = 'SOLMOURN_CANONICAL_DM_STORY_BIBLE.md';
export const OWNER = 'Owner decision 2026-11-13 (seed v4)';
export const AUTHORED = 'Campaign prep authored for the app (not yet approved)';
export const LEGACY = 'Legacy 8-session kit (superseded; kept as working material)';
const T0 = '2026-11-12T00:00:00.000Z';

export const base = (id: string, sourceRef: string, canonStatus?: CanonStatus) => ({
  id, campaignId: CAMPAIGN_ID, createdAt: T0, updatedAt: T0, revision: 1, sourceRef, ...(canonStatus ? { canonStatus } : {}),
});
export const bib = (section: string) => `${BIBLE_FILE} § ${section}`;

function statusOf(heading: string): CanonStatus {
  const m = /\[([^\]]+)\]/.exec(heading);
  if (!m) return 'LOCKED';
  const t = m[1].toUpperCase();
  if (t.startsWith('LOCKED')) return 'LOCKED';
  if (t.includes('PLAYTEST')) return 'PLAYTEST';
  if (t.startsWith('WORKING')) return 'WORKING';
  if (t.startsWith('OPEN')) return 'OPEN';
  return 'LOCKED';
}

export const AMENDMENT_FILE = '01_DIVERGENCE_CANON_AMENDMENT.md';
const AMENDED = /human[- ]only|humans only|Human PCs only|fantasy races|Human-only/i;
export const AMENDMENT_BANNER = `> **Amended by Canon Amendment 001 (the Divergence):** human-only player-character eligibility is RETIRED; any official D&D species is allowed. Everything else in this section stands. (${AMENDMENT_FILE})`;

/** Split the Divergence amendment into lore entries (one per numbered section), verbatim. */
export function amendmentToLore(md: string): LoreEntry[] {
  const STATUS: Record<string, CanonStatus> = { '1': 'LOCKED', '2': 'LOCKED', '3': 'WORKING', '4': 'LOCKED', '5': 'WORKING', '6': 'LOCKED', '7': 'LOCKED' };
  const out: LoreEntry[] = [];
  const parts = md.replace(/\r/g, '').split(/^## (?=\d+\. )/m).slice(1);
  for (const p of parts) {
    const [head, ...rest] = p.split('\n');
    const m = /^(\d+)\. (.*)/.exec(head);
    if (!m) continue;
    out.push({
      ...base(`div-${m[1]}`, `${AMENDMENT_FILE} § ${m[1]}`), title: `Divergence: ${m[2].trim()}`, category: 'Amendment 001 - the Divergence', canonStatus: STATUS[m[1]] ?? 'WORKING',
      visibility: 'DM_ONLY', tags: ['amendment', 'species'], order: 2000 + Number(m[1]), bodyMd: rest.join('\n').trim(), playerMd: '',
    });
  }
  return out;
}

/**
 * Split the canonical bible into one lore entry per numbered subsection, verbatim.
 * The bible file is the single source of truth: these entries are extracted, never paraphrased.
 */
export function bibleToLore(md: string): LoreEntry[] {
  const lines = md.replace(/\r/g, '').split('\n');
  const out: LoreEntry[] = [];
  let category = 'Story Bible';
  let top = '';
  let cur: { num: string; heading: string; body: string[] } | null = null;
  const flush = () => {
    if (!cur) return;
    let body = cur.body.join('\n').replace(/\n---\s*$/g, '').trim();
    if (AMENDED.test(body)) body = `${AMENDMENT_BANNER}\n\n${body}`;
    if (!body) { cur = null; return; }
    const bracket = /\[([^\]]+)\]/.exec(cur.heading)?.[1];
    const title = cur.heading.replace(/\s*\[[^\]]+\]\s*/g, '').replace(/^\d+(\.\d+)?\.?\s+/, '').trim();
    const [a, b] = cur.num.split('.');
    out.push({
      ...base(`bible-${cur.num.replace('.', '-')}`, bib(cur.num)),
      title, category, canonStatus: statusOf(cur.heading), visibility: 'DM_ONLY', tags: ['story-bible'],
      order: Number(a) * 100 + Number(b ?? 0),
      bodyMd: bracket ? `**Status in the bible:** ${bracket}\n\n${body}` : body,
      playerMd: '',
    });
    cur = null;
  };
  for (const line of lines) {
    const h1 = /^# (\d+)\. (.*)/.exec(line);
    const h2 = /^## (\d+\.\d+) (.*)/.exec(line);
    if (h1) {
      flush();
      top = h1[1];
      category = `${h1[1]}. ${h1[2].replace(/\s*\(.*\)\s*$/, '')}`;
      cur = { num: top, heading: h1[2], body: [] };
    } else if (h2) {
      flush();
      cur = { num: h2[1], heading: `${h2[1]} ${h2[2]}`, body: [] };
    } else if (/^# /.test(line) || /^\*\*End of canonical/.test(line)) {
      flush();
    } else if (cur) cur.body.push(line);
  }
  flush();
  return out;
}
