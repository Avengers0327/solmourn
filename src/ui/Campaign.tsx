// Branch choices, campaign state trackers, DM Academy, stat cards and the canon-upgrade report.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Branch, Campaign, Clock, Lesson, Session, StatCard } from '../domain/types';
import { CAMPAIGN_ID } from '../domain/types';
import { changeClock, nowIso, update } from '../data/repo';
import { getSeedReport, resolveCollision, type SeedCollision } from '../data/seedEngine';
import { CanonChip, Chip, ConfirmBtn, Empty, Md, Pips, Seg, Sheet, TextField } from './kit';
import { fmtTime, useNav, useRow, useRows } from './state';

/** Small "how do I run this?" button that opens the matching DM Academy lesson. */
export function Help({ lesson, label = 'How to run this' }: { lesson: string; label?: string }) {
  const nav = useNav();
  return <button className="btn sm ghost" aria-label={label} title={label} onClick={() => nav.open({ type: 'lesson', id: lesson })}>?</button>;
}

function useCurrentSession(): Session | undefined {
  const campaign = useRow<Campaign>('campaigns', CAMPAIGN_ID);
  const sessions = useRows<Session>('sessions');
  return sessions.find((s) => s.id === campaign?.currentSessionId) ?? sessions.sort((a, b) => a.index - b.index)[0];
}

// ---------------- Branch choices ----------------
function BranchCard({ b }: { b: Branch }) {
  const chosen = b.options.find((o) => o.id === b.chosenOptionId);
  const choose = (id: string | undefined) =>
    update<Branch>('branches', b.id, { chosenOptionId: id, chosenAt: id ? nowIso() : undefined }, { summary: id ? `Choice recorded: ${b.title} → ${b.options.find((o) => o.id === id)?.label}` : `Choice cleared: ${b.title}`, undoable: true, eventType: 'branch' });
  return (
    <div className="card">
      <div className="row between"><h3>{b.title}</h3>{b.canonStatus && <CanonChip s={b.canonStatus} />}</div>
      <p className="small muted" style={{ margin: '4px 0 8px' }}>When: {b.preconditionMd}</p>
      {b.options.map((o) => {
        const on = o.id === b.chosenOptionId;
        return (
          <button key={o.id} className="list-item" style={on ? { borderColor: 'var(--amber)' } : undefined} aria-pressed={on} onClick={() => choose(on ? undefined : o.id)}>
            <div className="grow">
              <div className="t">{on ? '● ' : '○ '}{o.label}</div>
              <div className="small muted"><strong>Changes:</strong> {o.stateChangesMd}</div>
              <div className="small muted"><strong>Later:</strong> {o.downstreamMd}</div>
            </div>
          </button>
        );
      })}
      <p className="small" style={{ color: 'var(--ok)' }}>Recovery path: {b.recoveryMd}</p>
      {chosen && <p className="small muted">Recorded {fmtTime(b.chosenAt)}. Clocks do not move by themselves: apply the changes you agree with.</p>}
      <TextField label="What actually happened (DM note)" area tone="private" value={b.notesMd} onSave={(v) => update<Branch>('branches', b.id, { notesMd: v })} />
    </div>
  );
}

export function BranchesSheet() {
  const session = useCurrentSession();
  const [scope, setScope] = useState<'session' | 'all'>('session');
  const all = useRows<Branch>('branches').sort((a, b) => a.sessionIndex - b.sessionIndex);
  const shown = scope === 'session' ? all.filter((b) => b.sessionIndex === session?.index) : all;
  return (
    <Sheet title="Choices" actions={<Help lesson="les-branching" />}>
      <Seg label="Choice scope" value={scope} onChange={setScope} options={[{ value: 'session', label: `Session ${session?.index ?? ''}` }, { value: 'all', label: `All (${all.filter((b) => b.chosenOptionId).length}/${all.length} decided)` }]} />
      <p className="small muted" style={{ margin: '8px 2px' }}>Decision points are WORKING prep. Tap what the players did; tap again to clear. Retreat, refusal, partial success and early discovery are all valid - add a note.</p>
      {shown.map((b) => <BranchCard key={b.id} b={b} />)}
      {!shown.length && <Empty>No prepared decision points for this session.</Empty>}
    </Sheet>
  );
}

// ---------------- Campaign state ----------------
export function StateSheet() {
  const nav = useNav();
  const clocks = useRows<Clock>('clocks');
  const branches = useRows<Branch>('branches').filter((b) => b.chosenOptionId).sort((a, b) => a.sessionIndex - b.sessionIndex);
  return (
    <Sheet title="Campaign state" actions={<Help lesson="les-clocks" />}>
      <p className="small muted" style={{ marginBottom: 8 }}>Everything that persists between sessions. Trackers are WORKING tools and move only when you move them.</p>
      {(['core', 'state'] as const).map((g) => (
        <div className="card" key={g}>
          <div className="label">{g === 'core' ? 'Core clocks' : 'State trackers'}</div>
          {clocks.filter((c) => (c.group ?? 'core') === g).map((c) => (
            <div className="clock" key={c.id}>
              <button className="name" onClick={() => nav.open({ type: 'clock', id: c.id })}>{c.name}</button>
              <div className="row">
                <button className="btn sm" aria-label={`Lower ${c.name}`} disabled={c.value <= 0} onClick={() => changeClock(c, -1)}>−</button>
                <button className="btn sm primary" aria-label={`Advance ${c.name}`} disabled={c.value >= c.max} onClick={() => changeClock(c, 1)}>+</button>
              </div>
              <Pips value={c.value} max={c.max} label={c.name} />
            </div>
          ))}
        </div>
      ))}
      <div className="section-title"><span>Decisions made</span><button className="btn sm" onClick={() => nav.open({ type: 'branches' })}>All choices</button></div>
      {branches.map((b) => (
        <div className="card" key={b.id}>
          <div className="small muted">Session {b.sessionIndex} · {b.title}</div>
          <strong>{b.options.find((o) => o.id === b.chosenOptionId)?.label}</strong>
          {b.notesMd && <p className="small">{b.notesMd}</p>}
        </div>
      ))}
      {!branches.length && <Empty>No decisions recorded yet.</Empty>}
    </Sheet>
  );
}

// ---------------- DM Academy ----------------
export function AcademySheet() {
  const nav = useNav();
  const lessons = useRows<Lesson>('lessons').sort((a, b) => a.order - b.order);
  const done = lessons.filter((l) => l.done).length;
  return (
    <Sheet title="DM Academy">
      <div className="banner private">🔒 DM only. Coaching for running this campaign. Lessons contain spoilers and are never exported.</div>
      <p className="small muted" style={{ marginBottom: 8 }}>{done}/{lessons.length} done · about {lessons.reduce((a, l) => a + l.minutes, 0)} minutes in total. Start with 1-3 before Session Zero.</p>
      {lessons.map((l) => (
        <button key={l.id} className="list-item" onClick={() => nav.open({ type: 'lesson', id: l.id })}>
          <span aria-hidden>{l.done ? '✓' : l.order}</span>
          <div className="grow"><div className="t">{l.title}</div><div className="s">{l.summary}</div></div>
          <Chip>{l.minutes} min</Chip>
        </button>
      ))}
      {!lessons.length && <Empty>No lessons loaded.</Empty>}
    </Sheet>
  );
}

export function LessonSheet({ id }: { id: string }) {
  const l = useRow<Lesson>('lessons', id);
  if (!l) return <Sheet title="Lesson">…</Sheet>;
  return (
    <Sheet title={l.title}>
      <div className="row wrap" style={{ marginBottom: 8 }}><span className="chip private">🔒 DM only</span><Chip>{l.minutes} min</Chip>{l.done && <Chip tone="amber">✓ Done</Chip>}</div>
      <Md text={l.bodyMd} />
      <div className="card" style={{ marginTop: 12 }}><div className="label">Rehearsal exercise</div><Md text={l.exerciseMd} /></div>
      <button className="btn block primary" onClick={() => update<Lesson>('lessons', l.id, { done: !l.done })}>{l.done ? 'Mark as not done' : '✓ Mark as done'}</button>
    </Sheet>
  );
}

// ---------------- Stat cards ----------------
export function StatCardsSheet() {
  const cards = useRows<StatCard>('statCards');
  const [kind, setKind] = useState<StatCard['kind'] | 'ALL'>('ALL');
  const shown = cards.filter((c) => kind === 'ALL' || c.kind === kind);
  return (
    <Sheet title="Stat cards">
      <div className="banner warn">PLAYTEST. Original numbers written for this campaign, not published stat blocks and not balance-tested. Tune freely; start easier than you think.</div>
      <Seg label="Card type" value={kind} onChange={setKind} options={[{ value: 'ALL', label: 'All' }, { value: 'HUMAN', label: 'People' }, { value: 'MACHINE', label: 'Machines' }, { value: 'WILDLIFE', label: 'Wildlife' }, { value: 'HAZARD', label: 'Hazards' }]} />
      <div style={{ height: 10 }} />
      {shown.map((c) => (
        <div className="card" key={c.id}>
          <div className="row between"><h3>{c.name}</h3><Chip>{c.tier}</Chip></div>
          {c.kind !== 'HAZARD' && <p className="small" style={{ margin: '4px 0' }}><strong>AC</strong> {c.ac} · <strong>HP</strong> {c.hp} · <strong>Init</strong> {c.initBonus >= 0 ? '+' : ''}{c.initBonus} · <strong>Speed</strong> {c.speed}</p>}
          <p className="small"><strong>{c.kind === 'HAZARD' ? 'Effect' : 'Attacks'}:</strong> {c.attacksMd}</p>
          <p className="small"><strong>{c.kind === 'HAZARD' ? 'Dealing with it' : 'Traits'}:</strong> {c.traitsMd}</p>
          <p className="small"><strong>Tactics:</strong> {c.tacticsMd}</p>
          <p className="small muted"><strong>Scaling:</strong> {c.scalingMd}</p>
        </div>
      ))}
      {!shown.length && <Empty>No cards.</Empty>}
    </Sheet>
  );
}

// ---------------- Canon upgrade report ----------------
export function SeedReportSheet() {
  const nav = useNav();
  const report = useLiveQuery(getSeedReport, []);
  const open = (table: string, id: string) => {
    const type = ({ lore: 'lore', npcs: 'npc', locations: 'location', clues: 'clue', revelations: 'revelation', sessions: 'session', timeline: 'timeline', canonDecisions: 'decision' } as Record<string, string>)[table];
    if (type) nav.open({ type, id } as never);
  };
  if (!report) return <Sheet title="Canon upgrade report"><Empty>No report yet.</Empty></Sheet>;
  const Row = ({ c }: { c: SeedCollision }) => (
    <div className="card">
      <strong>{c.label}</strong> <span className="small muted">· {c.table}</span>
      <p className="small muted">{c.why}</p>
      <details><summary className="small">Show the new canon version</summary><pre className="small" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(c.incoming, null, 1).slice(0, 4000)}</pre></details>
      <div className="grid3" style={{ marginTop: 8 }}>
        <button className="btn sm" onClick={() => resolveCollision(c, 'mine')}>Keep mine</button>
        <ConfirmBtn className="btn sm" confirm="Replace my text?" onConfirm={() => resolveCollision(c, 'incoming')}>Use new</ConfirmBtn>
        <button className="btn sm" onClick={() => resolveCollision(c, 'draft')}>Add as draft</button>
      </div>
    </div>
  );
  return (
    <Sheet title="Canon upgrade report">
      <div className="banner private">🔒 DM only. What the last canon seed update did to this device's campaign. Nothing you edited or played was overwritten.</div>
      <div className="card">
        <div className="label">Seed v{report.fromVersion} → v{report.version} · {fmtTime(report.appliedAt)}</div>
        <div className="grid2 small"><span>{report.inserted} records added</span><span>{report.updated} updated in place</span><span>{report.unchanged} unchanged</span><span>{report.retired} superseded records retired</span></div>
      </div>
      <div className="section-title">Collisions needing your decision ({report.collisions.length})</div>
      {report.collisions.map((c) => <Row key={`${c.table}:${c.id}`} c={c} />)}
      {!report.collisions.length && <div className="banner ok">✓ None.</div>}
      <div className="section-title">Kept as played history ({report.frozen.length})</div>
      {report.frozen.map((f) => <button key={`${f.table}:${f.id}`} className="list-item" onClick={() => open(f.table, f.id)}><div className="grow"><div className="t">{f.label}</div><div className="s">{f.table} · {f.why}</div></div></button>)}
      <div className="section-title">Legacy records kept ({report.legacyKept.length})</div>
      {report.legacyKept.map((f) => <button key={`${f.table}:${f.id}`} className="list-item" onClick={() => open(f.table, f.id)}><div className="grow"><div className="t">{f.label}</div><div className="s">{f.table} · {f.why}</div></div></button>)}
      {!report.frozen.length && !report.legacyKept.length && <p className="small muted">Nothing was frozen or kept as legacy.</p>}
    </Sheet>
  );
}
