import { useState } from 'react';
import type { Clue, GroupTrial, Revelation, Session, SessionEvent } from '../domain/types';
import { create, setMeta, softDelete, update } from '../data/repo';
import { blankRevelation } from '../data/blank';
import { isRevealedStatus } from '../domain/safe';
import { validateControlledTrial, type TrialConfig } from '../domain/rules';
import { Chip, ConfirmBtn, Empty, Seg, Sheet, TextField, VisChip, pretty } from './kit';
import { useMeta, useNav, useRow, useRows, useTrialConfig } from './state';

type View = 'truths' | 'clues' | 'threads' | 'trials';

export function Mysteries() {
  const nav = useNav();
  const cfg = useTrialConfig();
  const groupUse = useMeta<{ spentBy?: string }>('groupUse');
  const [view, setView] = useState<View>('truths');
  const revs = useRows<Revelation>('revelations').sort((a, b) => a.sessionIndex - b.sessionIndex);
  const clues = useRows<Clue>('clues').sort((a, b) => a.sessionIndex - b.sessionIndex);
  const threads = useRows<SessionEvent>('events').filter((e) => e.kind === 'THREAD' || e.kind === 'PROMISE');
  const trials = useRows<GroupTrial>('trials');
  const sessions = useRows<Session>('sessions');
  const options: { value: View; label: string }[] = [{ value: 'truths', label: 'Revelations' }, { value: 'clues', label: 'Clues' }, { value: 'threads', label: 'Threads' }];
  // The tab label comes from the imported campaign pack, not from app code.
  if (cfg) options.push({ value: 'trials', label: cfg.emergentLabel.split(' ').slice(-1)[0] });

  return (
    <div>
      <Seg label="Mysteries section" value={view} onChange={setView} options={options} />

      {view === 'truths' && <>
        <div className="section-title"><span>Truths &amp; their clue routes</span>
          <button className="btn sm primary" onClick={async () => nav.open({ type: 'revelation', id: await create('revelations', 'rev', blankRevelation(1)) })}>+ New</button></div>
        {revs.map((r) => {
          const mine = clues.filter((c) => c.revelationIds.includes(r.id));
          const found = mine.filter((c) => isRevealedStatus(c.status)).length;
          return (
            <button key={r.id} className="list-item" onClick={() => nav.open({ type: 'revelation', id: r.id })}>
              <div className="grow">
                <div className="small muted">Session {r.sessionIndex} · {found}/{mine.length} clue routes found{mine.length < 3 ? ' · needs more routes' : ''}</div>
                <div className="t">{r.title}</div>
              </div>
              <div className="stack" style={{ textAlign: 'right' }}><Chip tone={isRevealedStatus(r.status) ? 'amber' : ''}>{pretty(r.status)}</Chip><div><VisChip v={r.visibility} /></div></div>
            </button>
          );
        })}
        {!revs.length && <Empty>No revelations yet.</Empty>}
      </>}

      {view === 'clues' && <>
        <div className="section-title"><span>All clues by session</span><button className="btn sm" onClick={() => nav.open({ type: 'clueList' })}>Manage</button></div>
        {[...new Set(clues.map((c) => c.sessionIndex))].map((n) => (
          <div key={n}>
            <div className="label" style={{ marginTop: 12 }}>Session {n}{sessions.find((s) => s.index === n) ? ` · ${sessions.find((s) => s.index === n)!.title}` : ''}</div>
            {clues.filter((c) => c.sessionIndex === n).map((c) => (
              <button key={c.id} className="list-item" onClick={() => nav.open({ type: 'clue', id: c.id })}>
                <div className="grow"><div className="t">{c.title}</div><div className="s">→ {revs.filter((r) => c.revelationIds.includes(r.id)).map((r) => r.title).join(' · ') || 'not linked'}</div></div>
                <div className="stack" style={{ textAlign: 'right' }}><Chip tone={isRevealedStatus(c.status) ? 'amber' : ''}>{pretty(c.status)}</Chip><div><VisChip v={c.visibility} /></div></div>
              </button>
            ))}
          </div>
        ))}
        {!clues.length && <Empty>No clues yet.</Empty>}
      </>}

      {view === 'threads' && <>
        <div className="section-title"><span>Unresolved threads &amp; promises</span><button className="btn sm primary" onClick={() => nav.open({ type: 'note', kind: 'THREAD' })}>+ New</button></div>
        {threads.sort((a, b) => Number(a.resolved) - Number(b.resolved)).map((t) => (
          <button key={t.id} className="list-item" onClick={() => nav.open({ type: 'event', id: t.id })}>
            <div className="grow"><div className="small muted">{t.kind === 'PROMISE' ? 'Promise' : 'Thread'}</div><div className="t" style={t.resolved ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>{t.textMd}</div></div>
            <Chip tone={t.resolved ? '' : 'amber'}>{t.resolved ? 'RESOLVED' : 'OPEN'}</Chip>
          </button>
        ))}
        {!threads.length && <Empty>No threads.</Empty>}
      </>}

      {view === 'trials' && cfg && <>
        <div className="banner private">{cfg.dmNote}</div>
        <div className="card row between">
          <span>Controlled group use: <strong>{groupUse?.spentBy ? 'spent' : 'available'}</strong></span>
          {groupUse?.spentBy && <ConfirmBtn className="btn sm" confirm="Party took a long rest?" onConfirm={() => setMeta('groupUse', {})}>Long rest</ConfirmBtn>}
        </div>
        <div className="grid2">
          <button className="btn" onClick={async () => nav.open({ type: 'trial', id: await create('trials', 'trl', newTrial(cfg, 'EMERGENT')) })}>+ Emergent</button>
          <button className="btn" onClick={async () => nav.open({ type: 'trial', id: await create('trials', 'trl', newTrial(cfg, 'CONTROLLED')) })}>+ Controlled</button>
        </div>
        <div style={{ height: 10 }} />
        {trials.map((t) => (
          <button key={t.id} className="list-item" onClick={() => nav.open({ type: 'trial', id: t.id })}>
            <div className="grow"><div className="small muted">{t.type === 'EMERGENT' ? cfg.emergentLabel : cfg.controlledLabel}</div><div className="t">{t.title}</div></div>
            <Chip>{t.stages.filter((s) => s.result === 'SUCCESS' || s.result === 'OVERRIDE').length}/{t.stages.length}</Chip>
          </button>
        ))}
        {!trials.length && <Empty>Nothing recorded yet.</Empty>}
      </>}
    </div>
  );
}

const newTrial = (cfg: TrialConfig, type: GroupTrial['type']) => ({
  type, title: type === 'EMERGENT' ? 'Crisis event' : 'Controlled attempt', participants: [], sources: [], sharedAim: '', effect: '', consequencesMd: '', notesMd: '',
  stages: type === 'EMERGENT' ? cfg.emergentStages.map((s) => ({ ...s, result: 'PENDING' as const })) : [{ name: 'Lead check', dc: cfg.controlled.leadDc, result: 'PENDING' as const }],
});

export function TrialSheet({ id }: { id: string }) {
  const t = useRow<GroupTrial>('trials', id);
  const cfg = useTrialConfig();
  const groupUse = useMeta<{ spentBy?: string }>('groupUse');
  const nav = useNav();
  if (!t || !cfg) return <Sheet title="Trial">…</Sheet>;
  const save = (patch: Partial<GroupTrial>) => update<GroupTrial>('trials', t.id, patch);
  const spentBy = groupUse?.spentBy;
  const usedElsewhere = spentBy && spentBy !== t.id ? 1 : 0;
  const errors = t.type === 'CONTROLLED' ? validateControlledTrial(cfg, { participants: t.participants, sources: t.sources, effect: t.effect, usedSinceLongRest: usedElsewhere }) : [];
  return (
    <Sheet title={t.type === 'EMERGENT' ? cfg.emergentLabel : cfg.controlledLabel}>
      <span className="chip private">🔒 DM only</span>
      <TextField label={t.type === 'EMERGENT' ? 'Crisis event' : 'Attempt'} value={t.title} onSave={(v) => save({ title: v })} />
      <TextField label="Participants (one per line)" area value={t.participants.join('\n')} onSave={(v) => save({ participants: v.split('\n').map((x) => x.trim()).filter(Boolean) })} />
      <TextField label="Discipline sources / devices (one per line)" area value={t.sources.join('\n')} onSave={(v) => save({ sources: v.split('\n').map((x) => x.trim()).filter(Boolean) })} />
      {t.type === 'EMERGENT' ? (
        <TextField label="Shared aim" value={t.sharedAim} onSave={(v) => save({ sharedAim: v })} />
      ) : (
        <>
          <div className="banner">Needs {cfg.controlled.minParticipants}+ participants, {cfg.controlled.minSources}+ distinct sources, {cfg.controlled.rpPerCaster} RP per caster (or an energy cell per noncaster), one group use per long rest. {cfg.controlled.durationNote}. Spend RP on the character sheets yourself.</div>
          <div className="label">Chosen bounded effect</div>
          <div className="row wrap" style={{ marginBottom: 8 }}>
            {cfg.effects.map((e) => <button key={e} className={`btn sm ${t.effect === e ? 'primary' : ''}`} onClick={() => save({ effect: e })}>{e}</button>)}
          </div>
          <TextField label="…or describe the effect" value={t.effect} onSave={(v) => save({ effect: v })} />
          {errors.map((e) => <div key={e} className="banner bad">✕ {e}</div>)}
          {!errors.length && <div className="banner ok">✓ Legal to attempt.</div>}
          {spentBy === t.id ? (
            <div className="banner">This attempt spent the group's use for this long rest.</div>
          ) : (
            <ConfirmBtn className="btn block" confirm="Spend the group use?" onConfirm={() => errors.length === 0 && setMeta('groupUse', { spentBy: t.id })}>Spend group use (1 per long rest)</ConfirmBtn>
          )}
        </>
      )}
      <div className="section-title">Stages</div>
      {t.stages.map((s, i) => (
        <div className="card" key={i}>
          <div className="row between"><strong>{s.name} · DC {s.dc}</strong><Chip tone={s.result === 'FAIL' ? 'bad' : s.result === 'PENDING' ? '' : 'amber'}>{s.result}</Chip></div>
          <div style={{ height: 8 }} />
          <Seg label={`${s.name} result`} value={s.result} options={[{ value: 'PENDING', label: 'Pending' }, { value: 'SUCCESS', label: 'Success' }, { value: 'FAIL', label: 'Fail' }, { value: 'OVERRIDE', label: 'DM override' }]}
            onChange={(r) => save({ stages: t.stages.map((x, j) => (j === i ? { ...x, result: r } : x)) })} />
        </div>
      ))}
      <TextField label="Consequences" area value={t.consequencesMd} onSave={(v) => save({ consequencesMd: v })} />
      <TextField label="What it looked and felt like (observations, not destiny)" area value={t.notesMd} onSave={(v) => save({ notesMd: v })} />
      <ConfirmBtn className="btn danger block" onConfirm={() => { softDelete('trials', t.id, t.title); nav.close(); }}>Delete record</ConfirmBtn>
    </Sheet>
  );
}
