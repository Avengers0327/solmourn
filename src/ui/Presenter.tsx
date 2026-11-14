// Presenter mode: safe to show the table. This component receives data ONLY through
// safeProjection / buildSafeIndex, so nothing DM-only can be rendered or searched here,
// whatever the user taps or types. Leaving requires the passcode if one is set.
import { useMemo, useState } from 'react';
import { safeProjection, type SafeCard } from '../domain/safe';
import { buildSafeIndex, search } from '../domain/search';
import { Empty, Md, Seg } from './kit';
import { useCampaignData } from './share';
import { checkPassphrase, lockConfigured } from './Lock';

const GROUPS: { value: SafeCard['kind']; label: string }[] = [
  { value: 'discovery', label: 'Discoveries' }, { value: 'clue', label: 'Clues' }, { value: 'npc', label: 'People' },
  { value: 'place', label: 'Places' }, { value: 'lore', label: 'World' }, { value: 'timeline', label: 'Timeline' }, { value: 'doc', label: 'Guide' },
];

export function Presenter({ onExit }: { onExit: () => void }) {
  const data = useCampaignData();
  const cards = useMemo(() => (data ? safeProjection(data) : []), [data]);
  const index = useMemo(() => (data ? buildSafeIndex(data) : []), [data]);
  const [group, setGroup] = useState<SafeCard['kind']>('discovery');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<SafeCard | null>(null);
  const [exiting, setExiting] = useState(false);
  const [pin, setPin] = useState('');
  const [bad, setBad] = useState(false);
  const hits = useMemo(() => search(index, q), [index, q]);
  const shown = cards.filter((c) => c.kind === group);

  const tryExit = async () => {
    if (await checkPassphrase(pin)) onExit();
    else { setBad(true); setPin(''); }
  };

  return (
    <div className="app">
      <div className="topbar presenter-bar">
        <div className="brand" style={{ color: 'var(--cool)' }}>SOLMOURN<small>Presenter mode · player-safe only</small></div>
        <button className="btn sm" onClick={() => setExiting(true)}>Exit</button>
      </div>
      <div className="screen" style={{ fontSize: '1.1rem' }}>
        <input className="input" placeholder="Search what the party knows" aria-label="Search player-safe content" value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ height: 10 }} />
        {q.trim() ? (
          <>
            {hits.map((h) => (
              <div key={`${h.kind}:${h.id}`} className="card"><div className="label">{h.section ?? h.kind}</div><strong>{h.title}</strong><p className="small muted" style={{ marginTop: 4 }}>{h.snippet}</p></div>
            ))}
            {!hits.length && <Empty>Nothing the party knows matches that.</Empty>}
          </>
        ) : open ? (
          <>
            <button className="btn" style={{ marginBottom: 10 }} onClick={() => setOpen(null)}>← Back</button>
            <h2 style={{ color: 'var(--amber)', marginBottom: 4 }}>{open.title}</h2>
            {open.subtitle && <p className="muted" style={{ marginBottom: 8 }}>{open.subtitle}</p>}
            <Md text={open.text} />
          </>
        ) : (
          <>
            <Seg label="Presenter section" value={group} onChange={setGroup} options={GROUPS} />
            <div style={{ height: 10 }} />
            {shown.map((c) => (
              <button key={c.id} className="list-item" onClick={() => setOpen(c)}>
                <div className="grow"><div className="t">{c.title}</div>{c.kind !== 'doc' && <div className="s">{c.subtitle ? `${c.subtitle} · ` : ''}{c.text}</div>}</div>
              </button>
            ))}
            {!shown.length && <Empty>Nothing here yet.</Empty>}
          </>
        )}
      </div>
      {exiting && (
        <div className="fullscreen" role="dialog" aria-modal="true" aria-label="Leave Presenter mode">
          <h2>Leave Presenter mode?</h2>
          <p className="muted">DM-only content will be visible again. Turn the screen away from the table first.</p>
          {lockConfigured() && (
            <input className="input" style={{ maxWidth: 260, textAlign: 'center' }} type="password" autoComplete="current-password" placeholder="DM passphrase" aria-label="DM passphrase" value={pin} onChange={(e) => { setPin(e.target.value); setBad(false); }} />
          )}
          {bad && <p style={{ color: 'var(--bad)' }}>That is not the passphrase.</p>}
          <div className="row">
            <button className="btn" onClick={() => { setExiting(false); setPin(''); }}>Stay</button>
            <button className="btn primary" onClick={tryExit}>Leave</button>
          </div>
        </div>
      )}
    </div>
  );
}
