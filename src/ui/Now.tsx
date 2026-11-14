import { useState } from 'react';
import type { Campaign, Clock, Clue, Scene, Session, SessionEvent } from '../domain/types';
import { CAMPAIGN_ID } from '../domain/types';
import { changeClock, setScene, setSessionStatus } from '../data/repo';
import { isRevealedStatus } from '../domain/safe';
import { Help } from './Campaign';
import { Chip, ConfirmBtn, Md, Pips } from './kit';
import { getLocal, setLocal, useNav, useRow, useRows } from './state';
import { lockConfigured } from './Lock';

export function Now() {
  const nav = useNav();
  const campaign = useRow<Campaign>('campaigns', CAMPAIGN_ID);
  const sessions = useRows<Session>('sessions').sort((a, b) => a.index - b.index);
  const session = sessions.find((s) => s.id === campaign?.currentSessionId) ?? sessions[0];
  const scenes = useRows<Scene>('scenes').filter((s) => s.sessionId === session?.id).sort((a, b) => a.sequence - b.sequence);
  const clocks = useRows<Clock>('clocks').filter((c) => (c.group ?? 'core') === 'core');
  const [intro, setIntro] = useState(!getLocal().introSeen);
  const clues = useRows<Clue>('clues').filter((c) => c.sessionIndex === session?.index);
  const threads = useRows<SessionEvent>('events').filter((e) => e.kind === 'THREAD' && !e.resolved);
  const [safety, setSafety] = useState(false);
  const [showScene, setShowScene] = useState(false);

  if (!session) return <p className="muted center" style={{ padding: 24 }}>No sessions yet. Add one from Library → Sessions.</p>;
  const scene = scenes.find((s) => s.id === session.currentSceneId) ?? scenes.find((s) => s.status === 'ACTIVE') ?? scenes[0];
  const idx = scene ? scenes.indexOf(scene) : -1;
  const next = scenes[idx + 1];
  const prev = scenes[idx - 1];
  const found = clues.filter((c) => isRevealedStatus(c.status)).length;

  return (
    <div>
      {intro && (
        <div className="banner private">
          <strong>Your campaign is preloaded.</strong> Everything marked 🔒 DM only stays out of Presenter mode and player exports. Only text you approve as ✓ player-safe is ever shared. New to DMing? Open <strong>Library → DM Academy</strong>.
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn sm primary" onClick={() => { setLocal({ introSeen: true }); setIntro(false); nav.open({ type: 'academy' }); }}>Open the Academy</button>
            <button className="btn sm" onClick={() => { setLocal({ introSeen: true }); setIntro(false); }}>Got it</button>
          </div>
        </div>
      )}
      {!lockConfigured() && (
        <div className="banner warn">
          <strong>No DM passphrase yet.</strong> Anyone holding this phone can see every secret. <button className="btn sm" onClick={() => nav.open({ type: 'settings' })}>Set one</button>
        </div>
      )}
      <div className="card">
        <div className="row between">
          <button className="btn ghost sm" onClick={() => nav.open({ type: 'sessions' })} aria-label="Choose session">
            S{String(session.index).padStart(2, '0')} ▾
          </button>
          <Chip tone={session.status === 'ACTIVE' ? 'amber' : ''}>{session.status}</Chip>
        </div>
        <h2 style={{ fontSize: '1.25rem', margin: '4px 0 2px' }}>{session.title.toUpperCase()}</h2>
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="small muted">{session.arc ?? ''}{session.levelRange ? ` · level ${session.levelRange}` : ''} · session {session.index} of {sessions.length}</span>
          <Help lesson={session.index === 1 ? 'les-rehearsal' : 'les-prep'} label="How to run this session" />
        </div>
        <div className="grid2">
          {session.status === 'ACTIVE' ? (
            <button className="btn" onClick={() => setSessionStatus(session, 'PAUSED')}>⏸ Pause</button>
          ) : session.status === 'COMPLETE' ? (
            <button className="btn" onClick={() => setSessionStatus(session, 'ACTIVE')}>↺ Reopen</button>
          ) : (
            <button className="btn primary" onClick={() => setSessionStatus(session, 'ACTIVE')}>▶ {session.status === 'PAUSED' ? 'Resume' : 'Start session'}</button>
          )}
          <button className="btn" onClick={() => setSafety(true)}>✋ Safety pause</button>
        </div>
        {(session.status === 'ACTIVE' || session.status === 'PAUSED') && (
          <div className="grid2" style={{ marginTop: 8 }}>
            <ConfirmBtn onConfirm={() => setSessionStatus(session, 'COMPLETE')} confirm="End session?">■ End session</ConfirmBtn>
            <button className="btn" onClick={() => nav.open({ type: 'recap', id: session.id })}>↪ Recap</button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="label">Current scene {scenes.length ? `· ${idx + 1}/${scenes.length}` : ''}</div>
        {scene ? (
          <>
            <button className="row between" style={{ background: 'none', border: 0, padding: 0, width: '100%', textAlign: 'left', minHeight: 40 }} onClick={() => setShowScene(!showScene)} aria-expanded={showScene}>
              <h3 style={{ fontSize: '1.1rem' }}>{scene.title}</h3>
              <span className="muted" aria-hidden>{showScene ? '▴' : '▾'}</span>
            </button>
            {showScene && <Md text={scene.descriptionMd} className="small" />}
            <div className="grid3" style={{ marginTop: 10 }}>
              <button className="btn sm" disabled={!scene.readAloudMd} onClick={() => nav.open({ type: 'readAloud', id: scene.id })}>Read-aloud</button>
              <button className="btn sm primary" onClick={() => nav.open({ type: 'revealClue' })}>Reveal clue</button>
              <button className="btn sm" onClick={() => nav.open({ type: 'note', kind: 'EVENT', text: 'Twist: ' })}>New twist</button>
            </div>
            <div className="grid2" style={{ marginTop: 8 }}>
              <button className="btn sm ghost" disabled={!prev} onClick={() => prev && setScene(session, prev.id)}>← Previous</button>
              <button className="btn sm ghost" disabled={!next} onClick={() => next && setScene(session, next.id)}>Next scene →</button>
            </div>
          </>
        ) : (
          <p className="muted">No scenes planned for this session yet.</p>
        )}
      </div>

      <div className="card">
        <div className="label row between"><span>Clocks</span><Help lesson="les-clocks" label="When to move a clock" /></div>
        {clocks.map((c) => (
          <div className="clock" key={c.id}>
            <button className="name" onClick={() => nav.open({ type: 'clock', id: c.id })}>{c.name}</button>
            <div className="row">
              <button className="btn sm" aria-label={`Lower ${c.name}`} disabled={c.value <= 0} onClick={() => changeClock(c, -1)}>−</button>
              <button className="btn sm primary" aria-label={`Advance ${c.name}`} disabled={c.value >= c.max} onClick={() => changeClock(c, 1)}>+</button>
            </div>
            <Pips value={c.value} max={c.max} label={c.name} />
          </div>
        ))}
        {!clocks.length && <p className="muted small">No clocks.</p>}
      </div>

      <div className="label" style={{ marginTop: 14 }}>Quick access</div>
      <div className="grid3" style={{ marginBottom: 10 }}>
        <button className="btn" onClick={() => nav.open({ type: 'npcList' })}>NPCs</button>
        <button className="btn" onClick={() => nav.open({ type: 'clueList' })}>Clues {clues.length ? `${found}/${clues.length}` : ''}</button>
        <button className="btn" onClick={() => nav.open({ type: 'initiative' })}>Initiative</button>
        <button className="btn" onClick={() => nav.open({ type: 'dice' })}>Dice</button>
        <button className="btn" onClick={() => nav.setTab('party')}>Party</button>
        <button className="btn" onClick={() => nav.open({ type: 'notes' })}>Notes</button>
        <button className="btn" onClick={() => nav.open({ type: 'branches' })}>Choices</button>
        <button className="btn" onClick={() => nav.open({ type: 'state' })}>State</button>
        <button className="btn" onClick={() => nav.open({ type: 'statCards' })}>Stat cards</button>
      </div>

      <div className="card">
        <div className="label">Up next</div>
        <p>{next ? next.title : 'End of planned scenes'}</p>
        <div className="label" style={{ marginTop: 12 }}>Unresolved</div>
        {threads.length ? (
          <div className="row wrap">
            {threads.map((t) => (
              <button key={t.id} className="btn sm ghost" onClick={() => nav.open({ type: 'event', id: t.id })}>{t.textMd}</button>
            ))}
          </div>
        ) : <p className="muted small">No open threads.</p>}
      </div>

      <div className="grid2">
        <button className="btn primary" onClick={() => nav.open({ type: 'note' })}>+ Add note</button>
        <button className="btn" onClick={() => nav.open({ type: 'session', id: session.id })}>Session prep</button>
      </div>

      {safety && (
        <div className="fullscreen" role="dialog" aria-modal="true" aria-label="Safety pause">
          <div style={{ fontSize: '3rem' }} aria-hidden>✋</div>
          <h2>Paused</h2>
          <p className="muted">Take a moment. Anyone can ask for a change without explaining why.</p>
          <button className="btn primary" onClick={() => setSafety(false)}>Resume when everyone is ready</button>
        </div>
      )}
    </div>
  );
}
