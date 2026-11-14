// Record sheets: NPCs, clues, revelations, lore, places, timeline, decisions, docs, sessions, clocks, notes.
import { useEffect, useMemo, useState } from 'react';
import type {
  Campaign, CanonDecision, Clock, Clue, ClueStatus, Doc, EventKind, Location, LoreEntry, NPC, NpcStatus, Revelation, Scene, Session,
  SessionEvent, TimelineEntry, Visibility,
} from '../domain/types';
import { CAMPAIGN_ID } from '../domain/types';
import { addEvent, changeClock, create, revealClue, setClueStatus, setCurrentSession, setNpcStatus, softDelete, update } from '../data/repo';
import { blankClue, blankDecision, blankLocation, blankLore, blankNpc, blankRevelation, blankTimeline } from '../data/blank';
import { isRevealedStatus } from '../domain/safe';
import { CanonChip, Chip, ConfirmBtn, Empty, Md, Pips, RecordForm, Seg, Sheet, TextField, VisChip, VisibilityControl, pretty, type FieldSpec } from './kit';
import { fmtTime, useNav, useRow, useRows } from './state';

const CANON = ['LOCKED', 'WORKING', 'OPEN', 'PLAYTEST', 'RETIRED'];
const CLUE_STATUSES: ClueStatus[] = ['NOT_SEEN', 'HINTED', 'FOUND', 'INTERPRETED', 'PUBLIC'];

function useCurrentSession(): Session | undefined {
  const campaign = useRow<Campaign>('campaigns', CAMPAIGN_ID);
  const sessions = useRows<Session>('sessions');
  return sessions.find((s) => s.id === campaign?.currentSessionId) ?? sessions.sort((a, b) => a.index - b.index)[0];
}

/** View-first wrapper: read the record, tap Edit to change it. */
function ViewEdit({ view, edit }: { view: React.ReactNode; edit: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn sm" onClick={() => setEditing(!editing)}>{editing ? 'Done' : '✎ Edit'}</button>
      </div>
      {editing ? edit : view}
    </>
  );
}
const Block = ({ label, text, tone }: { label: string; text?: string; tone?: 'private' | 'safe' }) =>
  text?.trim() ? (
    <div className="card">
      <div className="label row">{label} {tone === 'private' ? <span className="chip private">🔒 DM only</span> : tone === 'safe' ? <span className="chip safe">✓ Player-safe</span> : null}</div>
      <Md text={text} />
    </div>
  ) : null;
const Source = ({ r }: { r: { sourceRef?: string; revision: number; updatedAt: string } }) => (
  <p className="small muted" style={{ marginTop: 12 }}>Source: {r.sourceRef ?? '—'} · revision {r.revision} · updated {fmtTime(r.updatedAt)}</p>
);

// ---------------- NPCs ----------------
const NPC_FIELDS: FieldSpec[] = [
  { key: 'name', label: 'Public name' },
  { key: 'role', label: 'Role' },
  { key: 'species', label: 'Species (blank = OPEN; never changes goals or role)' },
  { key: 'publicInfoMd', label: 'What players may know', kind: 'area', tone: 'safe' },
  { key: 'wants', label: 'Wants', tone: 'private' },
  { key: 'fears', label: 'Fears', tone: 'private' },
  { key: 'knowsMd', label: 'What they know', kind: 'area', tone: 'private' },
  { key: 'mistakenBeliefsMd', label: 'What they mistakenly believe', kind: 'area', tone: 'private' },
  { key: 'privateInfoMd', label: 'DM secret / notes', kind: 'area', tone: 'private' },
  { key: 'relationship', label: 'Relationship to party', tone: 'private' },
  { key: 'lastSeen', label: 'Last seen', tone: 'private' },
  { key: 'tags', label: 'Tags', kind: 'list' },
];
const NPC_STATUS: NpcStatus[] = ['MET', 'ALLY', 'HOSTILE', 'MISSING', 'UNMET'];

export function NpcSheet({ id }: { id: string }) {
  const n = useRow<NPC>('npcs', id);
  const nav = useNav();
  if (!n) return <Sheet title="NPC">…</Sheet>;
  return (
    <Sheet title={n.name}>
      <div className="row wrap" style={{ marginBottom: 8 }}><Chip tone="amber">{n.status}</Chip><VisChip v={n.visibility} />{n.canonStatus && <CanonChip s={n.canonStatus} />}<span className="muted small">{n.role}</span></div>
      <div className="label">Mark as</div>
      <Seg label="NPC status" value={n.status} options={NPC_STATUS.map((s) => ({ value: s, label: pretty(s) }))} onChange={(s) => setNpcStatus(n, s)} />
      <div style={{ height: 10 }} />
      <ViewEdit
        view={
          <>
            <Block label="What players may know" text={n.publicInfoMd} tone="safe" />
            <Block label="Wants" text={n.wants} tone="private" />
            <Block label="Fears" text={n.fears} tone="private" />
            <Block label="Knows" text={n.knowsMd} tone="private" />
            <Block label="Gets wrong" text={n.mistakenBeliefsMd} tone="private" />
            <Block label="DM secret / notes" text={n.privateInfoMd} tone="private" />
            <Block label="Relationship to party" text={n.relationship} tone="private" />
            <Block label="Last seen" text={n.lastSeen} tone="private" />
          </>
        }
        edit={
          <>
            <RecordForm table="npcs" record={n} fields={NPC_FIELDS} />
            <ConfirmBtn className="btn danger block" onConfirm={() => { softDelete('npcs', n.id, n.name); nav.close(); }}>Delete NPC</ConfirmBtn>
          </>
        }
      />
      <VisibilityControl table="npcs" record={n} label={n.name} />
      <Source r={n} />
    </Sheet>
  );
}

export function NpcList() {
  const nav = useNav();
  const npcs = useRows<NPC>('npcs').filter((n) => n.canonStatus !== 'RETIRED').sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Sheet title="NPCs" actions={<button className="btn sm primary" onClick={async () => nav.open({ type: 'npc', id: await create('npcs', 'npc', blankNpc()) })}>+ New</button>}>
      {npcs.map((n) => (
        <button key={n.id} className="list-item" onClick={() => nav.open({ type: 'npc', id: n.id })}>
          <div className="grow"><div className="t">{n.name}</div><div className="s">{n.role}{n.wants ? ` · wants: ${n.wants}` : ''}</div></div>
          <Chip tone={n.status === 'HOSTILE' ? 'bad' : n.status === 'UNMET' ? '' : 'amber'}>{n.status}</Chip>
        </button>
      ))}
      {!npcs.length && <Empty>No NPCs yet.</Empty>}
    </Sheet>
  );
}

// ---------------- Clues ----------------
const CLUE_FIELDS: FieldSpec[] = [
  { key: 'title', label: 'Clue title', tone: 'private' },
  { key: 'privateTextMd', label: 'Private truth / DM detail', kind: 'area', tone: 'private' },
  { key: 'playerTitle', label: 'Player-facing title', tone: 'safe' },
  { key: 'playerTextMd', label: 'Player-safe wording', kind: 'area', tone: 'safe' },
  { key: 'discoveryRoutes', label: 'Discovery routes', kind: 'list', tone: 'private' },
  { key: 'evidenceItem', label: 'Evidence item', tone: 'private' },
  { key: 'sessionIndex', label: 'Session number', kind: 'number' },
];

export function ClueSheet({ id }: { id: string }) {
  const c = useRow<Clue>('clues', id);
  const revs = useRows<Revelation>('revelations');
  const session = useCurrentSession();
  const nav = useNav();
  if (!c) return <Sheet title="Clue">…</Sheet>;
  const linked = revs.filter((r) => c.revelationIds.includes(r.id));
  return (
    <Sheet title={c.title}>
      <div className="row wrap" style={{ marginBottom: 8 }}>
        <Chip tone={isRevealedStatus(c.status) ? 'amber' : ''}>{pretty(c.status)}</Chip><VisChip v={c.visibility} />{c.required && <Chip>Required</Chip>}<Chip>Session {c.sessionIndex}</Chip>{c.canonStatus && <CanonChip s={c.canonStatus} />}
      </div>
      <div className="label">Status at the table</div>
      <Seg label="Clue status" value={c.status} options={CLUE_STATUSES.map((s) => ({ value: s, label: pretty(s) }))} onChange={(s) => setClueStatus(c, s)} />
      {c.visibility !== 'REVEALED' && (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="label">Reveal to players</div>
          <p className="small muted">This makes ONLY the text below shareable. The private detail and linked truths stay DM-only.</p>
          <div className="banner ok" style={{ marginTop: 8 }}><strong>{c.playerTitle || 'Clue'}:</strong> {c.playerTextMd || <em>No player-safe wording yet - add some in Edit.</em>}</div>
          <button className="btn primary block" disabled={!c.playerTextMd.trim()} onClick={() => revealClue(c, session?.id)}>Mark found &amp; reveal</button>
        </div>
      )}
      <div style={{ height: 10 }} />
      <ViewEdit
        view={
          <>
            <Block label="Private truth / DM detail" text={c.privateTextMd} tone="private" />
            <Block label={`Player-safe wording${c.playerTitle ? ` — "${c.playerTitle}"` : ''}`} text={c.playerTextMd} tone="safe" />
            <Block label="Discovery routes" text={c.discoveryRoutes.map((r) => `- ${r}`).join('\n')} tone="private" />
            <Block label="Evidence item" text={c.evidenceItem} tone="private" />
          </>
        }
        edit={
          <>
            <RecordForm table="clues" record={c} fields={CLUE_FIELDS} />
            <div className="card">
              <div className="label">Points to</div>
              {revs.map((r) => (
                <label key={r.id} className="row" style={{ minHeight: 44 }}>
                  <input type="checkbox" checked={c.revelationIds.includes(r.id)} onChange={(e) => update<Clue>('clues', c.id, { revelationIds: e.target.checked ? [...c.revelationIds, r.id] : c.revelationIds.filter((x) => x !== r.id) })} />
                  <span>{r.title}</span>
                </label>
              ))}
              <label className="row" style={{ minHeight: 44 }}>
                <input type="checkbox" checked={c.required} onChange={(e) => update<Clue>('clues', c.id, { required: e.target.checked })} /><span>Required clue</span>
              </label>
            </div>
            <ConfirmBtn className="btn danger block" onConfirm={() => { softDelete('clues', c.id, c.title); nav.close(); }}>Delete clue</ConfirmBtn>
          </>
        }
      />
      {linked.length > 0 && (
        <>
          <div className="section-title">Points to <span className="chip private">🔒 DM only</span></div>
          {linked.map((r) => (
            <button key={r.id} className="list-item" onClick={() => nav.open({ type: 'revelation', id: r.id })}>
              <div className="grow"><div className="t">{r.title}</div></div><Chip>{pretty(r.status)}</Chip>
            </button>
          ))}
        </>
      )}
      <VisibilityControl table="clues" record={c} label={c.title} />
      <Source r={c} />
    </Sheet>
  );
}

function ClueRow({ c }: { c: Clue }) {
  const nav = useNav();
  return (
    <button className="list-item" onClick={() => nav.open({ type: 'clue', id: c.id })}>
      <div className="grow"><div className="t">{c.title}</div><div className="s">{c.discoveryRoutes.join(' · ') || c.privateTextMd}</div></div>
      <div className="stack" style={{ textAlign: 'right' }}><Chip tone={isRevealedStatus(c.status) ? 'amber' : ''}>{pretty(c.status)}</Chip></div>
    </button>
  );
}

export function ClueList() {
  const nav = useNav();
  const session = useCurrentSession();
  const [scope, setScope] = useState<'session' | 'all'>('session');
  const clues = useRows<Clue>('clues').sort((a, b) => a.sessionIndex - b.sessionIndex);
  const shown = scope === 'session' ? clues.filter((c) => c.sessionIndex === session?.index) : clues;
  return (
    <Sheet title="Clues" actions={<button className="btn sm primary" onClick={async () => nav.open({ type: 'clue', id: await create('clues', 'clu', blankClue(session?.index ?? 1)) })}>+ New</button>}>
      <Seg label="Clue scope" value={scope} options={[{ value: 'session', label: `Session ${session?.index ?? ''}` }, { value: 'all', label: 'All sessions' }]} onChange={setScope} />
      <div style={{ height: 10 }} />
      {shown.map((c) => <ClueRow key={c.id} c={c} />)}
      {!shown.length && <Empty>No clues here yet.</Empty>}
    </Sheet>
  );
}

/** Two taps from the cockpit: Reveal clue → Mark found. */
export function RevealClueSheet() {
  const session = useCurrentSession();
  const nav = useNav();
  const clues = useRows<Clue>('clues').filter((c) => c.sessionIndex === session?.index);
  const pending = clues.filter((c) => c.visibility !== 'REVEALED');
  const done = clues.filter((c) => c.visibility === 'REVEALED');
  return (
    <Sheet title={`Reveal clue · Session ${session?.index ?? ''}`}>
      <p className="small muted" style={{ marginBottom: 10 }}>Marking a clue found shares only its green player-safe line. Undo appears at the bottom for a few seconds.</p>
      {pending.map((c) => (
        <div className="card" key={c.id}>
          <div className="row between"><h3>{c.title}</h3>{c.required && <Chip>Required</Chip>}</div>
          <p className="small" style={{ color: 'var(--ok)', margin: '6px 0 10px' }}>✓ Players get: {c.playerTextMd || '— no player-safe wording yet —'}</p>
          <div className="grid2">
            <button className="btn primary" disabled={!c.playerTextMd.trim()} onClick={() => revealClue(c, session?.id)}>Mark found</button>
            <button className="btn" onClick={() => nav.open({ type: 'clue', id: c.id })}>{c.status === 'HINTED' ? 'Hinted · open' : 'Open'}</button>
          </div>
        </div>
      ))}
      {!pending.length && <Empty>Every clue planned for this session has been found.</Empty>}
      {done.length > 0 && <div className="section-title">Already found</div>}
      {done.map((c) => <ClueRow key={c.id} c={c} />)}
    </Sheet>
  );
}

// ---------------- Revelations ----------------
const REV_FIELDS: FieldSpec[] = [
  { key: 'title', label: 'Truth (private title)', tone: 'private' },
  { key: 'privateTruthMd', label: 'Private truth', kind: 'area', tone: 'private' },
  { key: 'prevailingBeliefMd', label: 'What people currently believe', kind: 'area', tone: 'private' },
  { key: 'whoKnowsMd', label: 'Who knows the truth', kind: 'area', tone: 'private' },
  { key: 'earliestRevealMd', label: 'Earliest reveal conditions', kind: 'area', tone: 'private' },
  { key: 'backupMd', label: 'Backup if every clue is missed', kind: 'area', tone: 'private' },
  { key: 'playerTitle', label: 'Player-facing title', tone: 'safe' },
  { key: 'playerSafeSummaryMd', label: 'Approved player summary', kind: 'area', tone: 'safe' },
  { key: 'spoilerTerms', label: 'Spoiler words until revealed', kind: 'list', tone: 'private' },
  { key: 'sessionIndex', label: 'Expected session', kind: 'number' },
];
export function RevelationSheet({ id }: { id: string }) {
  const r = useRow<Revelation>('revelations', id);
  const clues = useRows<Clue>('clues').filter((c) => c.revelationIds.includes(id));
  const nav = useNav();
  if (!r) return <Sheet title="Revelation">…</Sheet>;
  const found = clues.filter((c) => isRevealedStatus(c.status)).length;
  return (
    <Sheet title={r.title}>
      <div className="row wrap" style={{ marginBottom: 8 }}><Chip tone={isRevealedStatus(r.status) ? 'amber' : ''}>{pretty(r.status)}</Chip><VisChip v={r.visibility} /><Chip>Session {r.sessionIndex}</Chip><Chip>{found}/{clues.length} clues</Chip>{r.canonStatus && <CanonChip s={r.canonStatus} />}</div>
      {clues.length < 3 && <div className="banner warn">Three-clue rule: this truth has {clues.length} clue route{clues.length === 1 ? '' : 's'}. Aim for three different sources.</div>}
      <div className="label">Has the party grasped this?</div>
      <Seg label="Revelation status" value={r.status} options={CLUE_STATUSES.map((s) => ({ value: s, label: pretty(s) }))}
        onChange={(s) => update<Revelation>('revelations', r.id, { status: s }, { summary: `${r.title}: ${pretty(s)}`, undoable: true, eventType: 'revelation-status' })} />
      <div style={{ height: 10 }} />
      <ViewEdit
        view={<>
          <Block label="Objective truth" text={r.privateTruthMd} tone="private" />
          <Block label="Prevailing belief" text={r.prevailingBeliefMd} tone="private" />
          <Block label="Who knows" text={r.whoKnowsMd} tone="private" />
          <Block label="Earliest reveal" text={r.earliestRevealMd} tone="private" />
          <Block label={`Approved player summary${r.playerTitle ? ` — "${r.playerTitle}"` : ''}`} text={r.playerSafeSummaryMd} tone="safe" />
          <Block label="Backup if missed" text={r.backupMd} tone="private" />
        </>}
        edit={<>
          <RecordForm table="revelations" record={r} fields={REV_FIELDS} />
          <ConfirmBtn className="btn danger block" onConfirm={() => { softDelete('revelations', r.id, r.title); nav.close(); }}>Delete revelation</ConfirmBtn>
        </>}
      />
      <div className="section-title">Clue routes</div>
      {clues.map((c) => <ClueRow key={c.id} c={c} />)}
      {!clues.length && <Empty>No clues point here yet.</Empty>}
      <VisibilityControl table="revelations" record={r} label={r.title} />
      <p className="small muted">Setting this to Revealed shares only the approved player summary, and stops its spoiler words from being flagged in exports.</p>
      <Source r={r} />
    </Sheet>
  );
}

// ---------------- Lore / places / timeline / decisions ----------------
export function LoreSheet({ id }: { id: string }) {
  const l = useRow<LoreEntry>('lore', id);
  const nav = useNav();
  if (!l) return <Sheet title="Lore">…</Sheet>;
  return (
    <Sheet title={l.title}>
      <div className="row wrap" style={{ marginBottom: 8 }}><CanonChip s={l.canonStatus} /><VisChip v={l.visibility} /><Chip>{l.category}</Chip></div>
      <ViewEdit
        view={<><Block label="DM text" text={l.bodyMd} tone="private" /><Block label="Player-safe text" text={l.playerMd} tone="safe" /></>}
        edit={<>
          <RecordForm table="lore" record={l} fields={[
            { key: 'title', label: 'Title' }, { key: 'category', label: 'Category' },
            { key: 'canonStatus', label: 'Canon status', kind: 'select', options: CANON },
            { key: 'bodyMd', label: 'DM text', kind: 'area', tone: 'private' },
            { key: 'playerMd', label: 'Player-safe text', kind: 'area', tone: 'safe' },
            { key: 'tags', label: 'Tags', kind: 'list' },
          ]} />
          <ConfirmBtn className="btn danger block" onConfirm={() => { softDelete('lore', l.id, l.title); nav.close(); }}>Delete entry</ConfirmBtn>
        </>}
      />
      <VisibilityControl table="lore" record={l} label={l.title} />
      <Source r={l} />
    </Sheet>
  );
}

export function LocationSheet({ id }: { id: string }) {
  const l = useRow<Location>('locations', id);
  const all = useRows<Location>('locations');
  const nav = useNav();
  if (!l) return <Sheet title="Place">…</Sheet>;
  const parent = all.find((x) => x.id === l.parentLocationId);
  const kids = all.filter((x) => x.parentLocationId === l.id);
  return (
    <Sheet title={l.name}>
      <div className="row wrap" style={{ marginBottom: 8 }}><VisChip v={l.visibility} />{l.canonStatus && <CanonChip s={l.canonStatus} />}{parent && <button className="btn sm ghost" onClick={() => nav.open({ type: 'location', id: parent.id })}>in {parent.name}</button>}</div>
      <ViewEdit
        view={<>
          <Block label="DM notes" text={l.bodyMd} tone="private" />
          <Block label="Secret aliases" text={l.aliases.join(', ')} tone="private" />
          <Block label="Player-safe description" text={l.playerMd} tone="safe" />
        </>}
        edit={<>
          <RecordForm table="locations" record={l} fields={[
            { key: 'name', label: 'Name' },
            { key: 'bodyMd', label: 'DM notes', kind: 'area', tone: 'private' },
            { key: 'aliases', label: 'Secret aliases', kind: 'list', tone: 'private' },
            { key: 'playerMd', label: 'Player-safe description', kind: 'area', tone: 'safe' },
          ]} />
          <ConfirmBtn className="btn danger block" onConfirm={() => { softDelete('locations', l.id, l.name); nav.close(); }}>Delete place</ConfirmBtn>
        </>}
      />
      {kids.length > 0 && <div className="section-title">Within {l.name}</div>}
      {kids.map((k) => (
        <button key={k.id} className="list-item" onClick={() => nav.open({ type: 'location', id: k.id })}><div className="grow t">{k.name}</div><VisChip v={k.visibility} /></button>
      ))}
      <VisibilityControl table="locations" record={l} label={l.name} />
      <Source r={l} />
    </Sheet>
  );
}

export function TimelineSheet({ id }: { id: string }) {
  const t = useRow<TimelineEntry>('timeline', id);
  const nav = useNav();
  if (!t) return <Sheet title="Timeline">…</Sheet>;
  return (
    <Sheet title={`${t.whenLabel} · ${t.title}`}>
      <div className="row wrap" style={{ marginBottom: 8 }}><CanonChip s={t.canonStatus} /><VisChip v={t.visibility} /></div>
      <ViewEdit
        view={<><Block label="What truly happened" text={t.bodyMd} tone="private" /><Block label="Player-safe version" text={t.playerMd} tone="safe" /></>}
        edit={<>
          <RecordForm table="timeline" record={t} fields={[
            { key: 'whenLabel', label: 'When' }, { key: 'sort', label: 'Sort order (year)', kind: 'number' }, { key: 'title', label: 'Title' },
            { key: 'canonStatus', label: 'Canon status', kind: 'select', options: CANON },
            { key: 'bodyMd', label: 'What truly happened', kind: 'area', tone: 'private' },
            { key: 'playerMd', label: 'Player-safe version', kind: 'area', tone: 'safe' },
          ]} />
          <ConfirmBtn className="btn danger block" onConfirm={() => { softDelete('timeline', t.id, t.title); nav.close(); }}>Delete entry</ConfirmBtn>
        </>}
      />
      <VisibilityControl table="timeline" record={t} label={t.title} />
      <Source r={t} />
    </Sheet>
  );
}

export function DecisionSheet({ id }: { id: string }) {
  const d = useRow<CanonDecision>('canonDecisions', id);
  if (!d) return <Sheet title="Decision">…</Sheet>;
  return (
    <Sheet title={d.topic}>
      <div className="row wrap" style={{ marginBottom: 8 }}><CanonChip s={d.status} /><span className="chip private">🔒 DM only</span></div>
      {d.rejected.length > 0 && <div className="banner bad">Rejected: {d.rejected.join(', ')}</div>}
      {d.options.length > 0 && <div className="banner">Candidates (not approved): {d.options.join(', ')}</div>}
      <div className="banner private">Nothing becomes canon until you select it and set the status yourself. Every change is logged in Change history.</div>
      <RecordForm table="canonDecisions" record={d} fields={[
        { key: 'topic', label: 'Decision' },
        { key: 'selectedOption', label: 'Selected option (blank = undecided)' },
        { key: 'status', label: 'Status', kind: 'select', options: CANON },
        { key: 'rationaleMd', label: 'Rationale / notes', kind: 'area' },
        { key: 'options', label: 'Candidate options', kind: 'list' },
        { key: 'rejected', label: 'Rejected options', kind: 'list' },
      ]} />
      <Source r={d} />
    </Sheet>
  );
}

export function DecisionsSheet() {
  const nav = useNav();
  const rows = useRows<CanonDecision>('canonDecisions');
  return (
    <Sheet title="Canon decisions" actions={<button className="btn sm primary" onClick={async () => nav.open({ type: 'decision', id: await create('canonDecisions', 'dec', blankDecision()) })}>+ New</button>}>
      {rows.map((d) => (
        <button key={d.id} className="list-item" onClick={() => nav.open({ type: 'decision', id: d.id })}>
          <div className="grow"><div className="t">{d.topic}</div><div className="s">{d.selectedOption ? `Selected: ${d.selectedOption}` : 'Undecided'}</div></div>
          <CanonChip s={d.status} />
        </button>
      ))}
      {!rows.length && <Empty>No decisions logged.</Empty>}
    </Sheet>
  );
}

// ---------------- Documents ----------------
export function DocSheet({ id, find }: { id: string; find?: string }) {
  const d = useRow<Doc>('docs', id);
  const [full, setFull] = useState(!find);
  const body = useMemo(() => {
    if (!d) return '';
    if (full || !find) return d.bodyMd;
    const lines = d.bodyMd.split('\n');
    const i = lines.findIndex((l) => /^#{1,4}\s/.test(l) && l.replace(/^#+\s+/, '') === find);
    if (i < 0) return d.bodyMd;
    let j = i + 1;
    while (j < lines.length && !/^#{1,4}\s/.test(lines[j])) j++;
    return lines.slice(i, j).join('\n');
  }, [d, find, full]);
  if (!d) return <Sheet title="Document">…</Sheet>;
  return (
    <Sheet title={d.title}>
      <div className="row wrap" style={{ marginBottom: 10 }}><VisChip v={d.visibility} /><span className="small muted">{d.fileName}</span></div>
      {!full && <button className="btn block" style={{ marginBottom: 10 }} onClick={() => setFull(true)}>Open the full document</button>}
      <Md text={body} />
    </Sheet>
  );
}

// ---------------- Sessions ----------------
export function SessionsSheet() {
  const nav = useNav();
  const current = useCurrentSession();
  const sessions = useRows<Session>('sessions').sort((a, b) => a.index - b.index);
  return (
    <Sheet title="Sessions">
      {sessions.map((s, i) => (
        <div key={s.id}>
        {s.arc && s.arc !== sessions[i - 1]?.arc && <div className="section-title"><span>{s.arc}</span><span className="chip private">🔒 DM only</span></div>}
        <div className="card">
          <div className="row between"><h3>S{String(s.index).padStart(2, '0')} · {s.title}</h3><Chip tone={s.id === current?.id ? 'amber' : ''}>{s.id === current?.id ? 'CURRENT' : s.status}</Chip></div>
          {s.levelRange && <p className="small muted">Suggested level {s.levelRange} · working title</p>}
          <div className="grid2" style={{ marginTop: 8 }}>
            <button className="btn sm" onClick={() => nav.open({ type: 'session', id: s.id })}>Prep &amp; notes</button>
            <button className="btn sm" disabled={s.id === current?.id} onClick={() => { setCurrentSession(s.id); nav.close(); }}>Make current</button>
          </div>
        </div>
        </div>
      ))}
    </Sheet>
  );
}

export function SessionSheet({ id }: { id: string }) {
  const s = useRow<Session>('sessions', id);
  const scenes = useRows<Scene>('scenes').filter((x) => x.sessionId === id).sort((a, b) => a.sequence - b.sequence);
  const nav = useNav();
  const [tab, setTab] = useState<'prep' | 'scenes' | 'notes'>('prep');
  if (!s) return <Sheet title="Session">…</Sheet>;
  return (
    <Sheet title={`Session ${s.index} · ${s.title}`}>
      {s.arc && <p className="small muted" style={{ marginBottom: 8 }}>{s.arc}{s.levelRange ? ` · suggested level ${s.levelRange}` : ''} · <button className="btn sm ghost" onClick={() => nav.open({ type: 'branches' })}>Choices</button></p>}
      <Seg label="Session view" value={tab} options={[{ value: 'prep', label: 'Prep' }, { value: 'scenes', label: 'Scenes' }, { value: 'notes', label: 'Notes & recap' }]} onChange={setTab} />
      <div style={{ height: 10 }} />
      {tab === 'prep' && <>
        <Block label="The question" text={s.questionMd} tone="private" />
        <Block label="Prep card" text={s.prepMd} tone="private" />
        <TextField label="My own prep notes" area tone="private" value={s.dmNotesMd} onSave={(v) => update<Session>('sessions', s.id, { dmNotesMd: v })} />
      </>}
      {tab === 'scenes' && <>
        {scenes.map((sc) => (
          <div className="card" key={sc.id}>
            <div className="row between"><h3>{sc.sequence}. {sc.title}</h3><Chip tone={sc.status === 'ACTIVE' ? 'amber' : ''}>{sc.status}</Chip></div>
            <TextField label="Title" value={sc.title} onSave={(v) => update<Scene>('scenes', sc.id, { title: v })} />
            <TextField label="DM description" area tone="private" value={sc.descriptionMd} onSave={(v) => update<Scene>('scenes', sc.id, { descriptionMd: v })} />
            <TextField label="Read-aloud (you choose when to read it)" area value={sc.readAloudMd} onSave={(v) => update<Scene>('scenes', sc.id, { readAloudMd: v })} />
          </div>
        ))}
        <button className="btn block" onClick={() => create('scenes', 'scn', { sessionId: s.id, title: 'New scene', descriptionMd: '', readAloudMd: '', sequence: scenes.length + 1, status: 'PENDING', visibility: 'DM_ONLY' })}>+ Add scene</button>
      </>}
      {tab === 'notes' && <>
        <TextField label="Player recap (3 sentences; goes into the player export)" area tone="safe" value={s.playerRecapMd} onSave={(v) => update<Session>('sessions', s.id, { playerRecapMd: v })} />
        <div className="card">
          <div className="label">Session title in player exports</div>
          <Seg label="Title visibility" value={s.visibility === 'DM_ONLY' ? 'DM_ONLY' : 'PLAYER_SAFE'} options={[{ value: 'DM_ONLY', label: '🔒 Hide title' }, { value: 'PLAYER_SAFE', label: '✓ Show title' }]}
            onChange={(v) => update<Session>('sessions', s.id, { visibility: v as Visibility })} />
          <p className="small muted" style={{ marginTop: 6 }}>Later session titles can be spoilers; hidden titles export as "Session {s.index}".</p>
        </div>
        <div className="grid2">
          <button className="btn" onClick={() => nav.open({ type: 'notes' })}>All notes</button>
          <button className="btn primary" onClick={() => nav.open({ type: 'recap', id: s.id })}>Recap &amp; export</button>
        </div>
      </>}
    </Sheet>
  );
}

// ---------------- Clocks ----------------
export function ClockSheet({ id }: { id: string }) {
  const c = useRow<Clock>('clocks', id);
  if (!c) return <Sheet title="Clock">…</Sheet>;
  const setReason = (i: number, reason: string) => update<Clock>('clocks', c.id, { reasonHistory: c.reasonHistory.map((h, j) => (j === i ? { ...h, reason } : h)) });
  return (
    <Sheet title={c.name}>
      <div className="card">
        <Pips value={c.value} max={c.max} label={c.name} />
        <div className="grid2" style={{ marginTop: 10 }}>
          <button className="btn" disabled={c.value <= 0} onClick={() => changeClock(c, -1)}>− Lower</button>
          <button className="btn primary" disabled={c.value >= c.max} onClick={() => changeClock(c, 1)}>+ Advance</button>
        </div>
      </div>
      <Block label="What it means" text={c.meaningMd} tone="private" />
      <div className="banner">Clocks move only when you move them - never on a timer. Advance when the fiction warrants, and write why.</div>
      <div className="section-title">History</div>
      {[...c.reasonHistory].map((h, i) => ({ h, i })).reverse().map(({ h, i }) => (
        <div className="card" key={i}>
          <div className="row between"><strong>{h.from} → {h.to}</strong><span className="small muted">{fmtTime(h.at)}</span></div>
          <TextField label="Why?" value={h.reason} placeholder="What happened in the fiction?" onSave={(v) => setReason(i, v)} />
        </div>
      ))}
      {!c.reasonHistory.length && <Empty>No changes yet.</Empty>}
    </Sheet>
  );
}

// ---------------- Notes / session events ----------------
export const EVENT_KINDS: { value: EventKind; label: string }[] = [
  { value: 'EVENT', label: 'Event' }, { value: 'REVELATION', label: 'Revelation' }, { value: 'NPC', label: 'NPC status' }, { value: 'PROMISE', label: 'Promise' },
  { value: 'THREAD', label: 'Open thread' }, { value: 'WORLD_FACT', label: 'World fact' }, { value: 'RULING', label: 'Rule call' }, { value: 'NEXT', label: 'Next session' },
];
const DRAFT_KEY = 'solmourn.noteDraft';

export function NoteSheet({ kind = 'EVENT', text = '' }: { kind?: EventKind; text?: string }) {
  const nav = useNav();
  const session = useCurrentSession();
  const [k, setK] = useState<EventKind>(kind);
  const [body, setBody] = useState(() => localStorage.getItem(DRAFT_KEY) || text);
  const [vis, setVis] = useState<Visibility>('DM_ONLY');
  // Draft is written to storage on every keystroke: a force-quit never loses a note.
  useEffect(() => localStorage.setItem(DRAFT_KEY, body), [body]);
  const save = async () => {
    if (!session || !body.trim()) return;
    await addEvent(session.id, k, body.trim(), vis);
    localStorage.removeItem(DRAFT_KEY);
    nav.close();
  };
  return (
    <Sheet title={`Note · Session ${session?.index ?? ''}`}>
      <Seg label="Note type" value={k} options={EVENT_KINDS} onChange={setK} />
      <label className="field" style={{ marginTop: 10 }}>
        <span>What happened?</span>
        <textarea className="input" autoFocus rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Short is fine. Clean it up after the session." />
      </label>
      <Seg label="Note visibility" value={vis} options={[{ value: 'DM_ONLY', label: '🔒 DM only' }, { value: 'PLAYER_SAFE', label: '✓ OK for player recap' }]} onChange={setVis} />
      <button className="btn primary block" style={{ marginTop: 12 }} disabled={!body.trim()} onClick={save}>Save note</button>
      <p className="small muted" style={{ marginTop: 8 }}>Drafts save as you type and survive closing the app.</p>
    </Sheet>
  );
}

export function EventSheet({ id }: { id: string }) {
  const e = useRow<SessionEvent>('events', id);
  const nav = useNav();
  if (!e) return <Sheet title="Note">…</Sheet>;
  return (
    <Sheet title={EVENT_KINDS.find((k) => k.value === e.kind)?.label ?? 'Note'}>
      <p className="small muted" style={{ marginBottom: 8 }}>{fmtTime(e.happenedAt)}</p>
      <TextField label="Text" area value={e.textMd} onSave={(v) => update<SessionEvent>('events', e.id, { textMd: v })} />
      <div className="label">Type</div>
      <Seg label="Note type" value={e.kind} options={EVENT_KINDS} onChange={(k) => update<SessionEvent>('events', e.id, { kind: k })} />
      <div className="label" style={{ marginTop: 12 }}>Visibility</div>
      <Seg label="Note visibility" value={e.visibility === 'DM_ONLY' ? 'DM_ONLY' : 'PLAYER_SAFE'} options={[{ value: 'DM_ONLY', label: '🔒 DM only' }, { value: 'PLAYER_SAFE', label: '✓ OK for player recap' }]}
        onChange={(v) => update<SessionEvent>('events', e.id, { visibility: v as Visibility })} />
      <div className="grid2" style={{ marginTop: 12 }}>
        {e.kind === 'THREAD' || e.kind === 'PROMISE' ? (
          <button className="btn" onClick={() => update<SessionEvent>('events', e.id, { resolved: !e.resolved }, { summary: e.resolved ? 'Reopened' : 'Resolved', undoable: true, eventType: 'thread' })}>{e.resolved ? 'Reopen' : '✓ Mark resolved'}</button>
        ) : <span />}
        <ConfirmBtn className="btn danger" onConfirm={() => { softDelete('events', e.id, 'note'); nav.close(); }}>Delete</ConfirmBtn>
      </div>
    </Sheet>
  );
}

export function NotesSheet() {
  const nav = useNav();
  const session = useCurrentSession();
  const events = useRows<SessionEvent>('events').filter((e) => e.sessionId === session?.id).sort((a, b) => b.happenedAt.localeCompare(a.happenedAt));
  return (
    <Sheet title={`Notes · Session ${session?.index ?? ''}`} actions={<button className="btn sm primary" onClick={() => nav.open({ type: 'note' })}>+ Note</button>}>
      {EVENT_KINDS.map((k) => {
        const rows = events.filter((e) => e.kind === k.value);
        if (!rows.length) return null;
        return (
          <div key={k.value}>
            <div className="section-title">{k.label}</div>
            {rows.map((e) => (
              <button key={e.id} className="list-item" onClick={() => nav.open({ type: 'event', id: e.id })}>
                <div className="grow"><div className="s" style={{ color: 'var(--text)' }}>{e.resolved ? '✓ ' : ''}{e.textMd}</div></div><VisChip v={e.visibility} />
              </button>
            ))}
          </div>
        );
      })}
      {!events.length && <Empty>No notes for this session yet.</Empty>}
    </Sheet>
  );
}

export function ReadAloudSheet({ id }: { id: string }) {
  const s = useRow<Scene>('scenes', id);
  return <Sheet title="Read aloud"><Md className="read-aloud" text={s?.readAloudMd ?? ''} /></Sheet>;
}

export function QuickAddSheet() {
  const nav = useNav();
  const session = useCurrentSession();
  const idx = session?.index ?? 1;
  const go = async (fn: () => Promise<void>) => { nav.close(); await fn(); };
  return (
    <Sheet title="Quick add" short>
      <div className="grid2">
        <button className="btn primary" onClick={() => go(async () => nav.open({ type: 'note' }))}>📝 Note</button>
        <button className="btn" onClick={() => go(async () => nav.open({ type: 'note', kind: 'THREAD' }))}>❓ Open thread</button>
        <button className="btn" onClick={() => go(async () => nav.open({ type: 'npc', id: await create('npcs', 'npc', blankNpc()) }))}>🧑 NPC</button>
        <button className="btn" onClick={() => go(async () => nav.open({ type: 'clue', id: await create('clues', 'clu', blankClue(idx)) }))}>🔎 Clue</button>
        <button className="btn" onClick={() => go(async () => nav.open({ type: 'note', kind: 'WORLD_FACT' }))}>🌍 World fact</button>
        <button className="btn" onClick={() => go(async () => nav.open({ type: 'note', kind: 'RULING' }))}>⚖️ Rule call</button>
        <button className="btn" onClick={() => go(async () => nav.open({ type: 'lore', id: await create('lore', 'lore', blankLore()) }))}>📜 Lore entry</button>
        <button className="btn" onClick={() => go(async () => nav.open({ type: 'location', id: await create('locations', 'loc', blankLocation()) }))}>📍 Place</button>
        <button className="btn" onClick={() => go(async () => nav.open({ type: 'revelation', id: await create('revelations', 'rev', blankRevelation(idx)) }))}>💡 Revelation</button>
        <button className="btn" onClick={() => go(async () => nav.open({ type: 'timeline', id: await create('timeline', 'tl', blankTimeline()) }))}>🕰 Timeline entry</button>
      </div>
    </Sheet>
  );
}
