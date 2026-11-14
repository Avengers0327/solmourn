// Read-only DM feed: renders a synced campaign snapshot as plain-text Markdown pages so an AI
// assistant (or the DM in any browser) can read the full DM view. Runs on the server (Cloudflare
// Worker) and in tests. It is generic on purpose: every field of every record is included, so
// new fields and the DM's own edits show up without changes here.
import type { TableName } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;
export type FeedTables = Partial<Record<TableName, Rec[]>>;

export interface FeedSection {
  id: string;
  title: string;
  about: string;
}

const SKIP = new Set(['id', 'campaignId', 'createdAt', 'updatedAt', 'revision', 'deletedAt', 'beforeJson', 'afterJson']);

const human = (key: string) => {
  const k = key.replace(/Md$/, '').replace(/Ids?$/, (m) => (m === 'Ids' ? ' ids' : ' id'));
  const s = k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const title = (r: Rec): string => String(r.title ?? r.name ?? r.topic ?? r.label ?? r.key ?? r.id ?? 'Untitled');
const live = (rows: Rec[] | undefined) => (rows ?? []).filter((r) => !r.deletedAt);

function value(v: unknown, depth = 0): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    const items = v.map((x) => value(x, depth + 1)).filter((x): x is string => !!x);
    if (!items.length) return null;
    if (v.every((x) => typeof x !== 'object' || x === null)) return items.join(', ');
    return items.map((x) => `- ${x.replace(/\n/g, '\n  ')}`).join('\n');
  }
  if (typeof v === 'object') {
    const parts = Object.entries(v as Rec)
      .filter(([k]) => !SKIP.has(k))
      .map(([k, x]) => [k, value(x, depth + 1)] as const)
      .filter(([, x]) => !!x)
      .map(([k, x]) => `${human(k)}: ${x}`);
    return parts.length ? parts.join(depth ? '; ' : '\n') : null;
  }
  return null;
}

/** Every non-empty field of a record, as Markdown. */
export function renderRecord(r: Rec, level = 3, skip: string[] = []): string {
  const out: string[] = [`${'#'.repeat(level)} ${title(r)}`];
  const skipAll = new Set([...SKIP, 'title', 'name', ...skip]);
  for (const [k, v] of Object.entries(r)) {
    if (skipAll.has(k)) continue;
    const text = value(v);
    if (!text) continue;
    out.push(text.includes('\n') || text.length > 90 ? `**${human(k)}:**\n\n${text}` : `**${human(k)}:** ${text}`);
  }
  return out.join('\n\n');
}

const sessionsOf = (t: FeedTables) => live(t.sessions).sort((a, b) => a.index - b.index);

export function feedSections(t: FeedTables): FeedSection[] {
  const docs = live(t.docs);
  return [
    { id: 'all', title: 'Everything except the long documents', about: 'All sections below in one page (large).' },
    { id: 'now', title: 'Where the campaign stands', about: 'Current session, trackers, branch choices made, recent table notes.' },
    ...sessionsOf(t).map((s) => ({ id: `session-${s.index}`, title: `Session ${s.index}: ${s.title}`, about: 'Prep card, scenes with read-alouds, choices, clues.' })),
    { id: 'mysteries', title: 'Mysteries', about: 'Revelations (the hidden truths) and every clue.' },
    { id: 'people', title: 'People', about: 'All NPCs, including DM-only secrets.' },
    { id: 'places', title: 'Places', about: 'Locations and site layouts.' },
    { id: 'world', title: 'World and canon', about: 'Lore, world history, canon decisions and consistency rules.' },
    { id: 'party', title: 'Party', about: 'Player characters as currently recorded.' },
    { id: 'log', title: 'Table log', about: 'What actually happened at the table, in order.' },
    { id: 'tools', title: 'Stat cards and DM Academy', about: 'Encounter and hazard cards, DM lessons.' },
    ...docs.map((d) => ({ id: `doc-${d.id}`, title: `Document: ${title(d)}`, about: 'Full source document (long).' })),
  ];
}

function sessionPage(t: FeedTables, index: number): string | null {
  const s = sessionsOf(t).find((x) => x.index === index);
  if (!s) return null;
  const out = [renderRecord(s, 1, ['currentSceneId'])];
  const scenes = live(t.scenes).filter((x) => x.sessionId === s.id).sort((a, b) => a.sequence - b.sequence);
  if (scenes.length) out.push('## Scenes', ...scenes.map((x) => renderRecord(x, 3, ['sessionId'])));
  const branches = live(t.branches).filter((b) => b.sessionIndex === index);
  if (branches.length) out.push('## Choices (branch points)', ...branches.map((b) => renderRecord(b)));
  const clues = live(t.clues).filter((c) => c.sessionIndex === index);
  if (clues.length) out.push('## Clues placed here', ...clues.map((c) => renderRecord(c)));
  const events = live(t.events).filter((e) => e.sessionId === s.id).sort((a, b) => String(a.happenedAt).localeCompare(String(b.happenedAt)));
  if (events.length) out.push('## What happened at the table', ...events.map((e) => `- ${e.happenedAt} · ${e.kind}${e.resolved ? ' (resolved)' : ''}: ${e.textMd}`));
  return out.join('\n\n');
}

const block = (heading: string, rows: Rec[], level = 3) => (rows.length ? [`## ${heading}`, ...rows.map((r) => renderRecord(r, level))] : []);

function nowPage(t: FeedTables): string {
  const camp = live(t.campaigns)[0];
  const sessions = sessionsOf(t);
  const current = sessions.find((s) => s.id === camp?.currentSessionId) ?? sessions.find((s) => s.status === 'ACTIVE') ?? sessions.find((s) => s.status !== 'COMPLETE') ?? sessions[0];
  const recent = live(t.events).sort((a, b) => String(b.happenedAt).localeCompare(String(a.happenedAt))).slice(0, 40);
  const chosen = live(t.branches).filter((b) => b.chosenOptionId);
  return [
    '# Where the campaign stands',
    camp ? renderRecord(camp, 2) : '',
    current ? `**Current session:** ${current.index}. ${current.title} (${current.status})` : '',
    '## Sessions', sessions.map((s) => `- ${s.index}. ${s.title}: ${s.status}${s.levelRange ? ` (level ${s.levelRange})` : ''}`).join('\n'),
    ...block('Trackers', live(t.clocks)),
    ...block('Branch choices made', chosen),
    recent.length ? '## Most recent table notes (newest first)' : '',
    recent.map((e) => `- ${e.happenedAt} · ${e.kind}: ${e.textMd}`).join('\n'),
  ].filter(Boolean).join('\n\n');
}

/** One page of the feed, or null if the section does not exist. */
export function renderFeed(t: FeedTables, section: string): string | null {
  const m = /^session-(\d+)$/.exec(section);
  if (m) return sessionPage(t, Number(m[1]));
  if (section.startsWith('doc-')) {
    const d = live(t.docs).find((x) => `doc-${x.id}` === section);
    return d ? `# ${title(d)}\n\n${d.bodyMd ?? d.textMd ?? value(d) ?? ''}` : null;
  }
  switch (section) {
    case 'now': return nowPage(t);
    case 'mysteries': return ['# Mysteries', ...block('Revelations', live(t.revelations)), ...block('Clues', live(t.clues).sort((a, b) => (a.sessionIndex ?? 99) - (b.sessionIndex ?? 99)))].join('\n\n');
    case 'people': return ['# People', ...live(t.npcs).sort((a, b) => title(a).localeCompare(title(b))).map((r) => renderRecord(r, 2))].join('\n\n');
    case 'places': return ['# Places', ...live(t.locations).map((r) => renderRecord(r, 2))].join('\n\n');
    case 'world': return ['# World and canon', ...block('Lore', live(t.lore)), ...block('World history', live(t.timeline).sort((a, b) => a.sort - b.sort)), ...block('Canon decisions', live(t.canonDecisions)), ...block('Consistency rules', live(t.canonRules))].join('\n\n');
    case 'party': {
      const pcs = live(t.pcs);
      return ['# Party', pcs.length ? pcs.map((r) => renderRecord(r, 2)).join('\n\n') : 'No player characters recorded yet.'].join('\n\n');
    }
    case 'log': {
      const ev = live(t.events).sort((a, b) => String(a.happenedAt).localeCompare(String(b.happenedAt)));
      const sess = new Map(live(t.sessions).map((s) => [s.id, `Session ${s.index}`]));
      return ['# Table log', ev.length ? ev.map((e) => `- ${e.happenedAt} · ${sess.get(e.sessionId) ?? 'no session'} · ${e.kind}${e.resolved ? ' (resolved)' : ''}: ${e.textMd}`).join('\n') : 'Nothing logged yet.'].join('\n\n');
    }
    case 'tools': return ['# Stat cards and DM Academy', ...block('Stat cards', live(t.statCards)), ...block('DM Academy lessons', live(t.lessons).sort((a, b) => a.order - b.order))].join('\n\n');
    case 'all': return ['now', ...sessionsOf(t).map((s) => `session-${s.index}`), 'mysteries', 'people', 'places', 'world', 'party', 'log', 'tools']
      .map((id) => renderFeed(t, id)).filter(Boolean).join('\n\n---\n\n');
    default: return null;
  }
}

/** The landing page: what this is and links to every section. */
export function renderFeedIndex(t: FeedTables, baseUrl: string, meta: { rev: number; updatedAt: string | null }): string {
  return [
    '# Solmourn: The Dying Light — DM campaign feed (read-only)',
    'This is the private, full DM view of a tabletop campaign, including spoilers. It is generated from the DM\'s app and reflects the last sync.',
    `Last synced: ${meta.updatedAt ?? 'never'} (version ${meta.rev}).`,
    'Open a section by its link. Each is plain text. "everything" is long; the session pages are the quickest way in.',
    ...feedSections(t).map((s) => `- [${s.title}](${baseUrl}/${s.id}) — ${s.about}\n  ${baseUrl}/${s.id}`),
  ].join('\n\n');
}
