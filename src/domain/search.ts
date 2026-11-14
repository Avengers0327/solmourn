// Offline keyword search. Two separately built indexes: the DM index reads full records;
// the SAFE index is built only from safe projections, so Presenter-mode search cannot
// surface hidden entities, snippets, aliases or cross-linked titles.
import { safeProjection, type CampaignData } from './safe';
import { SPELLS, VERIFICATION_LABEL, bookTitle, playerVisible } from '../content/spells';
import { SPECIES } from '../content/species';
import { CLASSES } from '../content/classes';
import { disciplineName } from '../content/rules';
import type { ClueStatus, Visibility } from './types';

export interface SearchEntry {
  kind: string;
  id: string;
  title: string;
  text: string;
  visibility: Visibility;
  status?: ClueStatus | string;
  /** For doc sections: heading used for provenance. */
  section?: string;
}
export type SearchScope = 'ALL' | 'DM_ONLY' | 'PLAYER_SAFE' | 'REVEALED';

function docSections(title: string, body: string): { heading: string; text: string }[] {
  const out: { heading: string; text: string }[] = [];
  let heading = title;
  let buf: string[] = [];
  for (const line of body.split('\n')) {
    const m = /^#{1,4}\s+(.*)/.exec(line);
    if (m) {
      if (buf.join('').trim()) out.push({ heading, text: buf.join('\n') });
      heading = m[1];
      buf = [];
    } else buf.push(line);
  }
  if (buf.join('').trim()) out.push({ heading, text: buf.join('\n') });
  return out;
}

const rulesEntries = (forPlayer: boolean): SearchEntry[] => [
  ...(forPlayer ? playerVisible(SPELLS) : SPELLS).map((p) => ({
    kind: 'pattern', id: p.id, title: p.name, visibility: (p.visibility ?? 'PLAYER_SAFE') as 'PLAYER_SAFE' | 'DM_ONLY',
    text: `${disciplineName(p.discipline)} ${p.level === 0 ? 'cantrip' : `level ${p.level}`} Pattern${p.status === 'EXCLUDED' ? ' (not available)' : ''}. ${p.school ?? ''}. ${p.rpCost} RP. ${p.action}, ${p.range}${p.concentration ? ', concentration' : ''}. ${(p.sources ?? []).map(bookTitle).join('; ')}. ${p.verification ? VERIFICATION_LABEL[p.verification] : ''}.${p.publishedName ? ` Published as ${p.publishedName}.` : ''}`,
  })),
  ...SPECIES.filter((s) => s.status !== 'NOT_SUPPORTED').map((s) => ({
    kind: 'species', id: s.id, title: s.name, visibility: 'PLAYER_SAFE' as const,
    text: `Playable species. ${s.sourceTitle}. ${s.status === 'IMPLEMENTED' ? 'Rules built in.' : 'Enter the traits from your book.'}`,
  })),
  ...CLASSES.flatMap((c) => c.features.filter((f) => f.name !== 'ASI').map((f) => ({
    kind: 'feature', id: f.id, title: `${c.name}: ${f.name}`, visibility: 'PLAYER_SAFE' as const, text: `Level ${f.level}. ${f.rulesMd}`,
  }))),
];

export function buildDmIndex(d: CampaignData & { timeline?: { id: string; title: string; bodyMd: string; whenLabel: string; visibility: Visibility; deletedAt?: string }[]; scenes?: { id: string; title: string; descriptionMd: string; visibility: Visibility; deletedAt?: string }[];
  lessons?: { id: string; title: string; summary: string; bodyMd: string; deletedAt?: string }[];
  branches?: { id: string; title: string; sessionIndex: number; preconditionMd: string; options: { label: string; stateChangesMd: string; downstreamMd: string }[]; deletedAt?: string }[];
  statCards?: { id: string; name: string; tier: string; attacksMd: string; traitsMd: string; tacticsMd: string; deletedAt?: string }[] }): SearchEntry[] {
  const live = <T extends { deletedAt?: string }>(rows: T[]) => rows.filter((r) => !r.deletedAt);
  return [
    ...live(d.npcs).map((n) => ({ kind: 'npc', id: n.id, title: n.name, visibility: n.visibility, status: n.status, text: [n.role, n.publicInfoMd, n.privateInfoMd, `Wants: ${n.wants}`, `Fears: ${n.fears}`, `Knows: ${n.knowsMd}`, `Gets wrong: ${n.mistakenBeliefsMd}`, n.relationship, n.lastSeen].join('\n') })),
    ...live(d.locations).map((l) => ({ kind: 'place', id: l.id, title: l.name, visibility: l.visibility, text: [l.bodyMd, l.playerMd, l.aliases.join(', ')].join('\n') })),
    ...live(d.lore).map((l) => ({ kind: 'lore', id: l.id, title: l.title, visibility: l.visibility, status: l.canonStatus, text: [l.category, l.bodyMd, l.playerMd, l.tags.join(' ')].join('\n') })),
    ...live(d.clues).map((c) => ({ kind: 'clue', id: c.id, title: c.title, visibility: c.visibility, status: c.status, text: [c.privateTextMd, c.playerTextMd, c.discoveryRoutes.join('; '), c.evidenceItem].join('\n') })),
    ...live(d.revelations).map((r) => ({ kind: 'revelation', id: r.id, title: r.title, visibility: r.visibility, status: r.status, text: [r.privateTruthMd, r.playerSafeSummaryMd, r.backupMd].join('\n') })),
    ...live(d.sessions).map((s) => ({ kind: 'session', id: s.id, title: `Session ${s.index}: ${s.title}`, visibility: s.visibility, status: s.status, text: [s.questionMd, s.prepMd, s.dmNotesMd, s.playerRecapMd].join('\n') })),
    ...live(d.scenes ?? []).map((s) => ({ kind: 'scene', id: s.id, title: s.title, visibility: s.visibility, text: s.descriptionMd })),
    ...live(d.events).map((e) => ({ kind: 'note', id: e.id, title: e.textMd.split('\n')[0].slice(0, 60), visibility: e.visibility, status: e.kind, text: e.textMd })),
    ...live(d.timeline ?? []).map((t) => ({ kind: 'timeline', id: t.id, title: `${t.whenLabel}: ${t.title}`, visibility: t.visibility, text: t.bodyMd })),
    ...live(d.lessons ?? []).map((l) => ({ kind: 'lesson', id: l.id, title: `Academy: ${l.title}`, visibility: 'DM_ONLY' as const, text: [l.summary, l.bodyMd].join('\n') })),
    ...live(d.branches ?? []).map((b) => ({ kind: 'choice', id: b.id, title: `Session ${b.sessionIndex} choice: ${b.title}`, visibility: 'DM_ONLY' as const, text: [b.preconditionMd, ...b.options.map((o) => `${o.label}: ${o.stateChangesMd} ${o.downstreamMd}`)].join('\n') })),
    ...live(d.statCards ?? []).map((c) => ({ kind: 'statcard', id: c.id, title: c.name, visibility: 'DM_ONLY' as const, text: [c.tier, c.attacksMd, c.traitsMd, c.tacticsMd].join('\n') })),
    ...live(d.pcs).map((p) => ({ kind: 'pc', id: p.id, title: p.name, visibility: 'PLAYER_SAFE' as const, text: [p.classId, p.background, p.district, p.notesMd, p.privateNotesMd, p.connectionsMd].join('\n') })),
    ...live(d.docs).flatMap((doc) => docSections(doc.title, doc.bodyMd).map((s, i) => ({ kind: 'doc', id: `${doc.id}#${i}`, title: s.heading, section: doc.title, visibility: doc.visibility, text: s.text }))),
    ...rulesEntries(false),
  ];
}

export function buildSafeIndex(d: CampaignData): SearchEntry[] {
  return [
    ...safeProjection(d).flatMap((c): SearchEntry[] =>
      c.kind === 'doc'
        ? docSections(c.title, c.text).map((s, i) => ({ kind: 'doc', id: `${c.id}#${i}`, title: s.heading, section: c.title, visibility: 'PLAYER_SAFE', text: s.text }))
        : [{ kind: c.kind, id: c.id, title: c.title, visibility: 'PLAYER_SAFE', text: [c.subtitle ?? '', c.text].join('\n') }]),
    ...rulesEntries(true),
  ];
}

const STOP = new Set('a an the is are was were of to in on at for and or what where who when why how does do did has have had with about tell me my our their there it its be this that'.split(' '));
export const tokenize = (q: string) => q.toLowerCase().split(/[^a-z0-9']+/).filter((t) => t.length > 1 && !STOP.has(t));

export interface SearchHit extends SearchEntry {
  score: number;
  snippet: string;
}
export function search(index: SearchEntry[], query: string, scope: SearchScope = 'ALL', limit = 40): SearchHit[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  // "what has the party learned?" → everything already revealed
  const learned = /\b(learned|discovered|party know|found out)\b/i.test(query);
  const hits: SearchHit[] = [];
  for (const e of index) {
    if (scope !== 'ALL' && e.visibility !== scope) continue;
    const title = e.title.toLowerCase();
    const text = e.text.toLowerCase();
    let score = 0;
    let matched = 0;
    let first = -1;
    for (const t of tokens) {
      const inTitle = title.includes(t);
      const at = text.indexOf(t);
      if (inTitle) score += 6;
      if (at >= 0) {
        score += 2;
        if (first < 0) first = at;
      }
      if (inTitle || at >= 0) matched++;
    }
    if (learned && e.visibility === 'REVEALED' && (e.kind === 'clue' || e.kind === 'revelation' || e.kind === 'discovery')) {
      score += 10;
      matched = tokens.length;
    }
    if (!matched) continue;
    if (matched === tokens.length) score += 8;
    else if (matched < Math.ceil(tokens.length / 2)) continue;
    const start = Math.max(0, first - 40);
    const snippet = (first >= 0 ? (start > 0 ? '…' : '') + e.text.slice(start, start + 150) : e.text.slice(0, 150)).replace(/\s+/g, ' ').trim();
    hits.push({ ...e, score, snippet });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
