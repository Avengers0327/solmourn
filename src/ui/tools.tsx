// Offline table tools: dice roller and initiative / encounter runner.
import { useEffect, useState } from 'react';
import type { Combatant, Encounter, PC, StatCard } from '../domain/types';
import { CONDITIONS } from '../content/rules';
import { abilityMod, fmtMod, rollDice, rollDie } from '../domain/rules';
import { create, newId, notify, update } from '../data/repo';
import { db } from '../data/db';
import { Chip, ConfirmBtn, Empty, Seg, Sheet, TextField } from './kit';
import { Help } from './Campaign';
import { useRow, useRows } from './state';

// ---------------- Dice ----------------
interface Roll { label: string; detail: string; total: number }
export function DiceSheet() {
  const [count, setCount] = useState(1);
  const [mod, setMod] = useState(0);
  const [mode, setMode] = useState<'normal' | 'adv' | 'dis'>('normal');
  const [log, setLog] = useState<Roll[]>([]);
  const roll = (sides: number) => {
    let dice: number[];
    let detail: string;
    if (sides === 20 && mode !== 'normal' && count === 1) {
      const pair = rollDice(2, 20);
      const kept = mode === 'adv' ? Math.max(...pair) : Math.min(...pair);
      dice = [kept];
      detail = `[${pair.join(', ')}] keep ${kept}`;
    } else {
      dice = rollDice(count, sides);
      detail = dice.join(' + ');
    }
    const total = dice.reduce((a, b) => a + b, 0) + mod;
    setLog([{ label: `${count}d${sides}${mod ? fmtMod(mod) : ''}${sides === 20 && mode !== 'normal' && count === 1 ? ` (${mode === 'adv' ? 'advantage' : 'disadvantage'})` : ''}`, detail: `${detail}${mod ? ` ${fmtMod(mod)}` : ''}`, total }, ...log].slice(0, 20));
  };
  return (
    <Sheet title="Dice">
      <div className="card center" aria-live="polite">
        {log[0] ? <><div className="label">{log[0].label}</div><div className="big-num" style={{ fontSize: '4rem' }}>{log[0].total}</div><div className="muted">{log[0].detail}</div></> : <div className="muted" style={{ padding: 20 }}>Tap a die.</div>}
      </div>
      <div className="grid3">
        {[20, 12, 10, 8, 6, 4, 100].map((s) => <button key={s} className={`btn ${s === 20 ? 'primary' : ''}`} style={{ minHeight: 56 }} onClick={() => roll(s)}>d{s}</button>)}
      </div>
      <div className="grid2" style={{ marginTop: 10 }}>
        <div className="card center" style={{ marginBottom: 0 }}>
          <div className="label">Dice</div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn sm" aria-label="Fewer dice" onClick={() => setCount(Math.max(1, count - 1))}>−</button><strong style={{ minWidth: 30 }}>{count}</strong>
            <button className="btn sm" aria-label="More dice" onClick={() => setCount(Math.min(20, count + 1))}>+</button>
          </div>
        </div>
        <div className="card center" style={{ marginBottom: 0 }}>
          <div className="label">Modifier</div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn sm" aria-label="Lower modifier" onClick={() => setMod(mod - 1)}>−</button><strong style={{ minWidth: 30 }}>{fmtMod(mod)}</strong>
            <button className="btn sm" aria-label="Raise modifier" onClick={() => setMod(mod + 1)}>+</button>
          </div>
        </div>
      </div>
      <div className="label" style={{ marginTop: 12 }}>d20 mode (single die)</div>
      <Seg label="d20 mode" value={mode} onChange={setMode} options={[{ value: 'normal', label: 'Normal' }, { value: 'adv', label: 'Advantage' }, { value: 'dis', label: 'Disadvantage' }]} />
      {log.length > 1 && <div className="section-title">Earlier</div>}
      {log.slice(1).map((r, i) => <div key={i} className="row between small" style={{ padding: '6px 2px', borderTop: '1px solid var(--line)' }}><span className="muted">{r.label}: {r.detail}</span><strong>{r.total}</strong></div>)}
    </Sheet>
  );
}

// ---------------- Initiative ----------------
const ENC_ID = 'enc-current';
const blankCombatant = (name: string, kind: Combatant['kind']): Combatant => ({
  id: newId('cmb'), name, kind, init: null, initBonus: 0, hp: 0, maxHp: 0, tempHp: 0, ac: 10, conditions: [], concentration: false, reactionUsed: false, out: '', notes: '',
});

export function InitiativeSheet() {
  const enc = useRow<Encounter>('encounters', ENC_ID);
  const pcs = useRows<PC>('pcs');
  const cards = useRows<StatCard>('statCards').filter((c) => c.kind !== 'HAZARD').sort((a, b) => a.name.localeCompare(b.name));
  const [open, setOpen] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  useEffect(() => {
    db.encounters.get(ENC_ID).then((e) => {
      if (!e) create('encounters', 'enc', { id: ENC_ID, name: 'Encounter', objective: '', round: 1, turnIndex: 0, combatants: [], notesMd: '' });
    });
  }, []);
  if (!enc) return <Sheet title="Initiative">…</Sheet>;

  const save = (patch: Partial<Encounter>) => update<Encounter>('encounters', enc.id, patch);
  const setC = (id: string, patch: Partial<Combatant>) => save({ combatants: enc.combatants.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const order = enc.combatants;
  const active = order[enc.turnIndex];

  const addPcs = () => {
    const have = new Set(order.map((c) => c.pcId));
    const add = pcs.filter((p) => !have.has(p.id)).map((p) => ({
      ...blankCombatant(p.name, 'PC'), pcId: p.id, hp: p.hp, maxHp: p.maxHp, tempHp: p.tempHp, ac: p.ac, initBonus: abilityMod(p.abilities.DEX), conditions: p.conditions,
    }));
    save({ combatants: [...order, ...add] });
  };
  const sort = (list: Combatant[]) => [...list].sort((a, b) => (b.init ?? -99) - (a.init ?? -99) || b.initBonus - a.initBonus);
  const rollAll = () => save({ combatants: sort(order.map((c) => (c.init === null ? { ...c, init: rollDie(20) + c.initBonus } : c))), turnIndex: 0 });
  const nextTurn = () => {
    if (!order.length) return;
    let i = enc.turnIndex;
    let round = enc.round;
    for (let step = 0; step < order.length; step++) {
      i++;
      if (i >= order.length) { i = 0; round++; }
      if (!order[i].out) break;
    }
    // A combatant's reaction comes back at the start of their own turn.
    save({ turnIndex: i, round, combatants: order.map((c, j) => (j === i ? { ...c, reactionUsed: false } : c)) });
  };
  const hit = (c: Combatant, sign: 1 | -1) => {
    const n = Math.abs(parseInt(amount, 10) || 0);
    if (!n) return;
    if (sign < 0) {
      const fromTemp = Math.min(c.tempHp, n);
      const hp = Math.max(0, c.hp - (n - fromTemp));
      setC(c.id, { tempHp: c.tempHp - fromTemp, hp });
      if (c.concentration) notify(`${c.name} is concentrating: CON save DC ${Math.max(10, Math.floor(n / 2))}`);
    } else setC(c.id, { hp: Math.min(c.maxHp || c.hp + n, c.hp + n) });
    setAmount('');
  };
  const writeBack = async () => {
    for (const c of order) if (c.pcId) await update<PC>('pcs', c.pcId, { hp: c.hp, tempHp: c.tempHp, conditions: c.conditions });
    notify('HP and conditions copied to the party sheets');
  };

  return (
    <Sheet title={`Initiative · Round ${enc.round}`} actions={<Help lesson="les-combat" label="How to run a fight" />}>
      <button className="btn primary block" style={{ minHeight: 60, fontSize: '1.1rem' }} disabled={!order.length} onClick={nextTurn}>
        Next turn →{active ? ` (now: ${active.name})` : ''}
      </button>
      <TextField label="Objective (rescue, hold 3 rounds, escape…)" value={enc.objective} onSave={(v) => save({ objective: v })} placeholder="Something other than 'defeat everything'" />

      {order.map((c, i) => (
        <div key={c.id} className={`card ${i === enc.turnIndex ? 'turn' : ''}`} style={c.out ? { opacity: 0.55 } : undefined}>
          <button className="row between" style={{ background: 'none', border: 0, padding: 0, width: '100%', textAlign: 'left', minHeight: 44 }} onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
            <div className="row grow">
              <strong style={{ minWidth: 30, color: 'var(--amber)' }}>{c.init ?? '—'}</strong>
              <div className="grow"><div className="t ellipsis">{i === enc.turnIndex ? '▶ ' : ''}{c.name}</div>
                <div className="small muted">AC {c.ac} · HP {c.hp}/{c.maxHp}{c.tempHp ? ` +${c.tempHp}` : ''}{c.concentration ? ' · concentrating' : ''}{c.reactionUsed ? ' · reaction used' : ''}{c.out ? ` · ${c.out.toLowerCase()}` : ''}</div></div>
            </div>
            <Chip>{c.kind}</Chip>
          </button>
          {c.conditions.length > 0 && <div className="row wrap" style={{ marginTop: 6 }}>{c.conditions.map((x) => <Chip key={x} tone="bad">{x}</Chip>)}</div>}
          {open === c.id && (
            <div style={{ marginTop: 10 }}>
              <div className="row">
                <input className="input grow" inputMode="numeric" placeholder="Amount" aria-label="HP amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
                <button className="btn danger" onClick={() => hit(c, -1)}>Dmg</button>
                <button className="btn" onClick={() => hit(c, 1)}>Heal</button>
              </div>
              <div className="grid2" style={{ marginTop: 8 }}>
                <button className={`btn sm ${c.reactionUsed ? 'primary' : ''}`} aria-pressed={c.reactionUsed} onClick={() => setC(c.id, { reactionUsed: !c.reactionUsed })}>Reaction {c.reactionUsed ? 'used' : 'ready'}</button>
                <button className={`btn sm ${c.concentration ? 'primary' : ''}`} aria-pressed={c.concentration} onClick={() => setC(c.id, { concentration: !c.concentration })}>Concentration</button>
              </div>
              <div className="grid3" style={{ marginTop: 8 }}>
                <TextField label="Init" type="number" value={c.init ?? ''} onSave={(v) => setC(c.id, { init: v === '' ? null : parseInt(v, 10) || 0 })} />
                <TextField label="AC" type="number" value={c.ac} onSave={(v) => setC(c.id, { ac: parseInt(v, 10) || 0 })} />
                <TextField label="Max HP" type="number" value={c.maxHp} onSave={(v) => { const m = parseInt(v, 10) || 0; setC(c.id, { maxHp: m, hp: c.hp === 0 || c.hp > m ? m : c.hp }); }} />
              </div>
              {c.notes && <p className="small" style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{c.notes}</p>}
              <TextField label="Name" value={c.name} onSave={(v) => setC(c.id, { name: v })} />
              <div className="label">Status</div>
              <Seg label="Combatant status" value={c.out || 'IN'} options={[{ value: 'IN', label: 'In fight' }, { value: 'DOWN', label: 'Down' }, { value: 'RETREATED', label: 'Retreated' }, { value: 'SURRENDERED', label: 'Surrendered' }]}
                onChange={(v) => setC(c.id, { out: v === 'IN' ? '' : (v as Combatant['out']) })} />
              <div className="label" style={{ marginTop: 8 }}>Conditions</div>
              <div className="row wrap">
                {CONDITIONS.map((x) => {
                  const on = c.conditions.includes(x);
                  return <button key={x} className={`btn sm ${on ? 'primary' : 'ghost'}`} aria-pressed={on} onClick={() => setC(c.id, { conditions: on ? c.conditions.filter((y) => y !== x) : [...c.conditions, x] })}>{on ? '✓ ' : ''}{x}</button>;
                })}
              </div>
              <ConfirmBtn className="btn danger sm" onConfirm={() => save({ combatants: order.filter((x) => x.id !== c.id), turnIndex: Math.min(enc.turnIndex, Math.max(0, order.length - 2)) })}>Remove</ConfirmBtn>
            </div>
          )}
        </div>
      ))}
      {!order.length && <Empty>Add the party, then any NPCs or monsters.</Empty>}

      <div className="grid2">
        <button className="btn" onClick={addPcs} disabled={!pcs.length}>+ Party</button>
        <button className="btn" onClick={() => save({ combatants: [...order, blankCombatant('NPC', 'NPC')] })}>+ NPC</button>
        <button className="btn" onClick={rollAll} disabled={!order.length}>🎲 Roll missing &amp; sort</button>
        <button className="btn" onClick={() => save({ combatants: sort(order), turnIndex: 0 })} disabled={!order.length}>Sort</button>
      </div>
      <label className="field" style={{ marginTop: 12 }}><span>Add from stat cards (PLAYTEST numbers)</span>
        <select className="input" value="" onChange={(e) => {
          const card = cards.find((c) => c.id === e.target.value);
          if (!card) return;
          const n = order.filter((c) => c.name.startsWith(card.name)).length + 1;
          save({ combatants: [...order, { ...blankCombatant(`${card.name} ${n}`, card.kind === 'HUMAN' ? 'NPC' : 'MONSTER'), ac: card.ac, hp: card.hp, maxHp: card.hp, initBonus: card.initBonus, notes: `${card.attacksMd}\n${card.traitsMd}\nTactics: ${card.tacticsMd}` }] });
        }}>
          <option value="">Choose an adversary…</option>
          {cards.map((c) => <option key={c.id} value={c.id}>{c.name} · AC {c.ac} · HP {c.hp} · {c.tier}</option>)}
        </select></label>
      <TextField label="Combat notes" area value={enc.notesMd} onSave={(v) => save({ notesMd: v })} />
      <div className="grid2">
        <ConfirmBtn confirm="Copy HP to sheets?" onConfirm={writeBack}>Save HP to party</ConfirmBtn>
        <ConfirmBtn className="btn danger" confirm="Clear the encounter?" onConfirm={() => save({ combatants: [], round: 1, turnIndex: 0, objective: '', notesMd: '' })}>End encounter</ConfirmBtn>
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>The app never changes a monster's HP on its own.</p>
    </Sheet>
  );
}
