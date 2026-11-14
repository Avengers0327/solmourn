import { useState } from 'react';
import type { Location, LoreEntry, NPC, Session, SessionEvent, TimelineEntry } from '../domain/types';
import { create } from '../data/repo';
import { blankLocation, blankLore, blankNpc, blankTimeline } from '../data/blank';
import { CanonChip, Chip, Empty, Seg, VisChip } from './kit';
import { EVENT_KINDS } from './sheets';
import { fmtTime, useNav, useRows } from './state';

function PlaceTree({ node, all, depth }: { node: Location; all: Location[]; depth: number }) {
  const nav = useNav();
  return (
    <div>
      <button className="list-item" style={{ marginLeft: Math.min(depth, 3) * 14, width: `calc(100% - ${Math.min(depth, 3) * 14}px)` }} onClick={() => nav.open({ type: 'location', id: node.id })}>
        <div className="grow"><div className="t">{node.name}</div><div className="s">{node.bodyMd}</div></div><VisChip v={node.visibility} />
      </button>
      {all.filter((p) => p.parentLocationId === node.id).map((p) => <PlaceTree key={p.id} node={p} all={all} depth={depth + 1} />)}
    </div>
  );
}

type View = 'lore' | 'places' | 'npcs' | 'history' | 'table';

export function World() {
  const nav = useNav();
  const [view, setView] = useState<View>('lore');
  const lore = useRows<LoreEntry>('lore');
  const places = useRows<Location>('locations');
  const npcs = useRows<NPC>('npcs').sort((a, b) => a.name.localeCompare(b.name));
  const timeline = useRows<TimelineEntry>('timeline').sort((a, b) => a.sort - b.sort);
  const events = useRows<SessionEvent>('events').sort((a, b) => a.happenedAt.localeCompare(b.happenedAt));
  const sessions = useRows<Session>('sessions');
  const categories = [...new Set(lore.map((l) => l.category))];
  const roots = places.filter((p) => !p.parentLocationId || !places.some((x) => x.id === p.parentLocationId));

  const add = async () => {
    if (view === 'lore') nav.open({ type: 'lore', id: await create('lore', 'lore', blankLore()) });
    else if (view === 'places') nav.open({ type: 'location', id: await create('locations', 'loc', blankLocation()) });
    else if (view === 'npcs') nav.open({ type: 'npc', id: await create('npcs', 'npc', blankNpc()) });
    else if (view === 'history') nav.open({ type: 'timeline', id: await create('timeline', 'tl', blankTimeline()) });
    else nav.open({ type: 'note' });
  };

  return (
    <div>
      <Seg label="World section" value={view} onChange={setView} options={[
        { value: 'lore', label: 'Lore' }, { value: 'places', label: 'Places' }, { value: 'npcs', label: 'NPCs' }, { value: 'history', label: 'History' }, { value: 'table', label: 'At the table' },
      ]} />
      <div className="section-title"><span>{{ lore: 'Lore & canon', places: 'Locations', npcs: 'People', history: 'World history (DM truth)', table: 'What the party actually did' }[view]}</span>
        <button className="btn sm primary" onClick={add}>+ New</button></div>

      {view === 'lore' && categories.map((cat) => (
        <div key={cat}>
          <div className="label" style={{ marginTop: 12 }}>{cat}</div>
          {lore.filter((l) => l.category === cat).map((l) => (
            <button key={l.id} className="list-item" onClick={() => nav.open({ type: 'lore', id: l.id })}>
              <div className="grow"><div className="t">{l.title}</div></div>
              <div className="row"><CanonChip s={l.canonStatus} /><VisChip v={l.visibility} /></div>
            </button>
          ))}
        </div>
      ))}
      {view === 'lore' && !lore.length && <Empty>No lore yet.</Empty>}

      {view === 'places' && roots.map((r) => <PlaceTree key={r.id} node={r} all={places} depth={0} />)}
      {view === 'places' && !places.length && <Empty>No places yet.</Empty>}

      {view === 'npcs' && npcs.map((n) => (
        <button key={n.id} className="list-item" onClick={() => nav.open({ type: 'npc', id: n.id })}>
          <div className="grow"><div className="t">{n.name}</div><div className="s">{n.role}</div></div>
          <div className="row"><Chip tone={n.status === 'HOSTILE' ? 'bad' : n.status === 'UNMET' ? '' : 'amber'}>{n.status}</Chip><VisChip v={n.visibility} /></div>
        </button>
      ))}
      {view === 'npcs' && !npcs.length && <Empty>No NPCs yet.</Empty>}

      {view === 'history' && timeline.map((t) => (
        <button key={t.id} className="list-item" onClick={() => nav.open({ type: 'timeline', id: t.id })}>
          <div className="grow"><div className="small" style={{ color: 'var(--amber)' }}>{t.whenLabel}</div><div className="t">{t.title}</div><div className="s">{t.bodyMd}</div></div>
          <div className="stack" style={{ textAlign: 'right' }}><CanonChip s={t.canonStatus} /><div><VisChip v={t.visibility} /></div></div>
        </button>
      ))}
      {view === 'history' && !timeline.length && <Empty>No history entries.</Empty>}

      {view === 'table' && sessions.sort((a, b) => a.index - b.index).map((s) => {
        const rows = events.filter((e) => e.sessionId === s.id);
        if (!rows.length) return null;
        return (
          <div key={s.id}>
            <div className="label" style={{ marginTop: 12 }}>Session {s.index} · {s.title}</div>
            {rows.map((e) => (
              <button key={e.id} className="list-item" onClick={() => nav.open({ type: 'event', id: e.id })}>
                <div className="grow"><div className="small muted">{EVENT_KINDS.find((k) => k.value === e.kind)?.label} · {fmtTime(e.happenedAt)}</div><div>{e.resolved ? '✓ ' : ''}{e.textMd}</div></div>
                <VisChip v={e.visibility} />
              </button>
            ))}
          </div>
        );
      })}
      {view === 'table' && !events.length && <Empty>Nothing logged yet. Notes you take during sessions build this timeline.</Empty>}
    </div>
  );
}
