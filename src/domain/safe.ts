// The ONLY path from campaign data to anything a player can see (Presenter mode, exports,
// share sheet). Allowlist-based: each projection copies named player-approved fields and
// nothing else, so private fields and linked DM notes cannot leak by omission.
import type { Clue, ClueStatus, Doc, Location, LoreEntry, NPC, PC, Revelation, Session, SessionEvent, TimelineEntry, Visibility } from './types';
import { classById } from '../content/classes';
import { disciplineName } from '../content/rules';
import { abilityMod, fmtMod, proficiencyBonus } from './rules';
import { innateFeatures, physiology, speciesName, speciesSelectionOf } from './species';

const shareable = (v: Visibility) => v === 'PLAYER_SAFE' || v === 'REVEALED';
const live = <T extends { deletedAt?: string }>(rows: T[]) => rows.filter((r) => !r.deletedAt);
export const isRevealedStatus = (s: ClueStatus) => s === 'FOUND' || s === 'INTERPRETED' || s === 'PUBLIC';

export interface SafeCard {
  kind: 'npc' | 'place' | 'lore' | 'clue' | 'discovery' | 'doc' | 'note' | 'timeline';
  id: string;
  title: string;
  subtitle?: string;
  text: string;
}

export const safeNpc = (n: NPC): SafeCard | null =>
  shareable(n.visibility) && !n.deletedAt ? { kind: 'npc', id: n.id, title: n.name, subtitle: n.role, text: n.publicInfoMd } : null;
export const safeLocation = (l: Location): SafeCard | null =>
  shareable(l.visibility) && !l.deletedAt ? { kind: 'place', id: l.id, title: l.name, text: l.playerMd } : null;
export const safeLore = (l: LoreEntry): SafeCard | null =>
  shareable(l.visibility) && !l.deletedAt && l.playerMd.trim() ? { kind: 'lore', id: l.id, title: l.title, subtitle: l.category, text: l.playerMd } : null;
/** A revealed clue exposes its approved player wording only - never its private text or linked truths. */
export const safeClue = (c: Clue): SafeCard | null =>
  c.visibility === 'REVEALED' && !c.deletedAt && c.playerTextMd.trim()
    ? { kind: 'clue', id: c.id, title: c.playerTitle || 'Clue', text: c.playerTextMd }
    : null;
export const safeRevelation = (r: Revelation): SafeCard | null =>
  r.visibility === 'REVEALED' && !r.deletedAt && r.playerSafeSummaryMd.trim()
    ? { kind: 'discovery', id: r.id, title: r.playerTitle || 'Discovery', text: r.playerSafeSummaryMd }
    : null;
export const safeTimeline = (t: TimelineEntry): SafeCard | null =>
  shareable(t.visibility) && !t.deletedAt && t.playerMd.trim() ? { kind: 'timeline', id: t.id, title: t.title, subtitle: t.whenLabel, text: t.playerMd } : null;
export const safeDoc = (d: Doc): SafeCard | null =>
  d.visibility === 'PLAYER_SAFE' && !d.deletedAt ? { kind: 'doc', id: d.id, title: d.title, text: d.bodyMd } : null;
export const safeEvent = (e: SessionEvent): SafeCard | null =>
  shareable(e.visibility) && !e.deletedAt ? { kind: 'note', id: e.id, title: e.kind, text: e.textMd } : null;

export interface CampaignData {
  sessions: Session[];
  npcs: NPC[];
  locations: Location[];
  lore: LoreEntry[];
  clues: Clue[];
  revelations: Revelation[];
  events: SessionEvent[];
  docs: Doc[];
  pcs: PC[];
  timeline?: TimelineEntry[];
}
const compact = <T,>(xs: (T | null)[]) => xs.filter((x): x is T => x !== null);

/** Everything Presenter mode is allowed to see. */
export function safeProjection(d: CampaignData): SafeCard[] {
  return [
    ...compact(d.npcs.map(safeNpc)),
    ...compact(d.locations.map(safeLocation)),
    ...compact(d.lore.map(safeLore)),
    ...compact(d.clues.map(safeClue)),
    ...compact(d.revelations.map(safeRevelation)),
    ...compact(d.docs.map(safeDoc)),
    ...compact((d.timeline ?? []).map(safeTimeline)),
  ];
}

const KIND_HEADINGS: Record<string, string> = {
  EVENT: 'What happened', REVELATION: 'What we learned', NPC: 'People', PROMISE: 'Promises made',
  THREAD: 'Open questions', WORLD_FACT: 'World details', RULING: 'Rulings', NEXT: 'Next time',
};

/** Player recap for one session. Built purely from safe projections. */
export function buildPlayerRecap(d: CampaignData, sessionId: string): string {
  const s = d.sessions.find((x) => x.id === sessionId);
  if (!s) return '';
  const out: string[] = [];
  out.push(`# Session ${s.index}${shareable(s.visibility) ? ` — ${s.title}` : ''}`);
  if (s.playerRecapMd.trim()) out.push(s.playerRecapMd.trim());

  const events = compact(live(d.events).filter((e) => e.sessionId === sessionId && e.kind !== 'RULING').map((e) => (safeEvent(e) ? e : null)));
  for (const kind of ['EVENT', 'REVELATION', 'NPC', 'PROMISE', 'WORLD_FACT', 'NEXT']) {
    const rows = events.filter((e) => e.kind === kind);
    if (rows.length) out.push(`## ${KIND_HEADINGS[kind]}\n${rows.map((e) => `- ${e.textMd.trim()}`).join('\n')}`);
  }
  const clues = compact(d.clues.filter((c) => c.discoveredSessionId === sessionId).map(safeClue));
  if (clues.length) out.push(`## Clues found\n${clues.map((c) => `- **${c.title}:** ${c.text.trim()}`).join('\n')}`);
  const revs = compact(d.revelations.filter((r) => r.sessionIndex <= s.index).map(safeRevelation));
  if (revs.length) out.push(`## What the party now knows\n${revs.map((r) => `- **${r.title}:** ${r.text.trim()}`).join('\n')}`);
  const threads = live(d.events).filter((e) => e.kind === 'THREAD' && !e.resolved && shareable(e.visibility));
  if (threads.length) out.push(`## Open questions\n${threads.map((t) => `- ${t.textMd.trim()}`).join('\n')}`);
  return out.join('\n\n') + '\n';
}

export function buildKnownNpcs(d: CampaignData): string {
  const rows = compact(d.npcs.filter((n) => n.status !== 'UNMET').map(safeNpc));
  return `# People we know\n\n${rows.map((n) => `## ${n.title}\n*${n.subtitle}*\n\n${n.text.trim()}`).join('\n\n') || '_Nobody yet._'}\n`;
}
export function buildKnownPlaces(d: CampaignData): string {
  const rows = compact(d.locations.map(safeLocation));
  return `# Places we know\n\n${rows.map((l) => `## ${l.title}\n${l.text.trim()}`).join('\n\n') || '_Nowhere yet._'}\n`;
}

/** Character sheet export: named fields only - privateNotesMd (the DM's secrets) is never read. */
export function buildCharacterSheet(pc: PC): string {
  const c = classById(pc.classId);
  const ab = (['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map((a) => `${a} ${pc.abilities[a]} (${fmtMod(abilityMod(pc.abilities[a]))})`).join(' · ');
  return [
    `# ${pc.name}`,
    `${speciesName(pc)} ${c?.name ?? pc.classId} ${pc.level}${pc.specialty ? ` (${pc.specialty})` : ''} · ${pc.background} · ${pc.district}`,
    `Attunement: ${disciplineName(pc.attunement)} · Player: ${pc.player || '—'}`,
    `**HP** ${pc.hp}/${pc.maxHp}${pc.tempHp ? ` (+${pc.tempHp} temp)` : ''} · **AC** ${pc.ac} · **Speed** ${pc.speed} ft · **Proficiency** ${fmtMod(proficiencyBonus(pc.level))}`,
    ab,
    speciesBlock(pc),
    pc.resources.length ? `## Resources\n${pc.resources.map((r) => `- ${r.name}: ${r.current}/${r.max}`).join('\n')}` : '',
    pc.inventoryMd.trim() ? `## Inventory\n${pc.inventoryMd.trim()}` : '',
    pc.connectionsMd.trim() ? `## Connections\n${pc.connectionsMd.trim()}` : '',
    pc.notesMd.trim() ? `## Notes\n${pc.notesMd.trim()}` : '',
  ].filter(Boolean).join('\n\n') + '\n';
}

function speciesBlock(pc: PC): string {
  const sel = speciesSelectionOf(pc);
  const b = physiology(sel);
  const moves = [`walk ${b.speed} ft`, b.fly ? `fly ${b.fly} ft` : '', b.swim ? `swim ${b.swim} ft` : '', b.climb ? `climb ${b.climb} ft` : ''].filter(Boolean).join(', ');
  const feats = innateFeatures(sel, pc.level);
  return [`## Species`, `${speciesName(pc)} · ${b.size} · ${moves}${b.darkvision ? ` · darkvision ${b.darkvision} ft` : ''}${b.resistances.length ? ` · resistant to ${b.resistances.join(', ')}` : ''}`,
    sel.heritageNote ? `Heritage: ${sel.heritageNote}` : '', ...feats.map((f) => `- **${f.name}** (${f.uses ? `${f.uses}/${f.recovery === 'SHORT_REST' ? 'short rest' : 'long rest'}` : 'at will'}; ${f.action}): ${f.note}`)].filter(Boolean).join('\n');
}

export interface SpoilerHit {
  term: string;
  revelationId: string;
  line: string;
}
/**
 * Second safety net behind the allowlist: flags text containing a term that belongs to a
 * revelation the party has not reached yet. Evaluates reveal state, not a permanent blacklist.
 */
export function scanSpoilers(text: string, revelations: Revelation[]): SpoilerHit[] {
  const hits: SpoilerHit[] = [];
  const lines = text.split('\n');
  for (const r of revelations) {
    if (r.deletedAt || (r.visibility === 'REVEALED' && isRevealedStatus(r.status))) continue;
    for (const term of r.spoilerTerms ?? []) {
      const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // whole-word match so "Unity" does not flag "community"
      const re = new RegExp(`(?<![A-Za-z])${esc}(?![A-Za-z])`, 'i');
      const line = lines.find((l) => re.test(l));
      if (line) hits.push({ term, revelationId: r.id, line: line.trim().slice(0, 160) });
    }
  }
  return hits;
}
