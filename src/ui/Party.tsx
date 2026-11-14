import { useMemo, useState } from 'react';
import { PATTERNS, normalizePatternId, patternById } from '../content/spells';
import { isKnown, isPrepared, toggleBook, togglePrep } from '../data/patternActions';
import type { Ability, Discipline, PC, Pattern } from '../domain/types';
import { CLASSES, DEVICES, classById, deviceSlots } from '../content/classes';
import { AMP_ENHANCEMENTS, AMP_TIERS, BACKGROUNDS, CONDITIONS, DISCIPLINES, DISTRICTS, RP_COST, disciplineName } from '../content/rules';
import {
  abilityMod, adjustResource, applyCast, applyRest, calcCast, canAddToBook, canPrepare, castInputFor, featuresFor, fmtMod, getRes, maxPatternLevel,
  prepareLimit, proficiencyBonus, rollDice, syncResources, useFeature as spendFeature,
} from '../domain/rules';
import { notify, softDelete, update } from '../data/repo';
import { PatternCard } from './Spells';
import { SpeciesPicker } from './SpeciesPicker';
import { innateFeatures, physiology, speciesName, speciesSelectionOf } from '../domain/species';
import { speciesById } from '../content/species';
import { Chip, ConfirmBtn, Empty, Md, Seg, SelectField, Sheet, TextField } from './kit';
import { useNav, useRow, useRows } from './state';

const ABILITIES: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const savePc = (pc: PC, patch: Partial<PC>, summary?: string) =>
  update<PC>('pcs', pc.id, patch, summary ? { summary, undoable: true, eventType: 'pc' } : {});

export function Party() {
  const nav = useNav();
  const pcs = useRows<PC>('pcs').sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <div className="section-title"><span>Player characters</span>
        <button className="btn sm primary" onClick={() => nav.open({ type: 'createPc' })}>+ New PC</button></div>
      {pcs.map((pc) => {
        const rp = getRes(pc, 'rp');
        return (
          <button key={pc.id} className="card tap" onClick={() => nav.open({ type: 'pc', id: pc.id })}>
            <div className="row between"><h3>{pc.name}</h3><span className="muted small">{classById(pc.classId)?.name} {pc.level}</span></div>
            <div className="hpbar" style={{ margin: '8px 0 6px' }} aria-hidden><i style={{ width: `${Math.max(0, Math.min(100, (pc.hp / Math.max(1, pc.maxHp)) * 100))}%` }} /></div>
            <div className="row wrap small">
              <span>HP {pc.hp}/{pc.maxHp}{pc.tempHp ? ` +${pc.tempHp}` : ''}</span><span className="muted">·</span><span>AC {pc.ac}</span>
              {rp && <><span className="muted">·</span><span>RP {rp.current}/{rp.max}</span></>}
              {pc.conditions.map((c) => <Chip key={c} tone="bad">{c}</Chip>)}
              {pc.exhaustion > 0 && <Chip tone="bad">Exhaustion {pc.exhaustion}</Chip>}
            </div>
          </button>
        );
      })}
      {!pcs.length && <Empty>No characters yet. Tap + New PC for the level-3 walkthrough. All classes are PLAYTEST homebrew.</Empty>}
      <div className="grid2" style={{ marginTop: 6 }}>
        <button className="btn" onClick={() => nav.open({ type: 'initiative' })}>Initiative</button>
        <button className="btn" onClick={() => nav.open({ type: 'rules' })}>Class &amp; rules cards</button>
      </div>
    </div>
  );
}

function Stepper({ label, value, onChange, big }: { label: string; value: number; onChange: (d: number) => void; big?: boolean }) {
  return (
    <div className="center">
      <div className="label">{label}</div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn sm" aria-label={`Decrease ${label}`} onClick={() => onChange(-1)}>−</button>
        <span className={big ? 'big-num' : ''} style={{ minWidth: 44, fontWeight: 700 }}>{value}</span>
        <button className="btn sm" aria-label={`Increase ${label}`} onClick={() => onChange(1)}>+</button>
      </div>
    </div>
  );
}

export function PcSheet({ id }: { id: string }) {
  const pc = useRow<PC>('pcs', id);
  const nav = useNav();
  const [amount, setAmount] = useState('');
  const [showFeatures, setShowFeatures] = useState(false);
  if (!pc) return <Sheet title="Character">…</Sheet>;
  const c = classById(pc.classId);
  const pb = proficiencyBonus(pc.level);
  const n = Math.abs(parseInt(amount, 10) || 0);
  const damage = () => {
    if (!n) return;
    const fromTemp = Math.min(pc.tempHp, n);
    savePc(pc, { tempHp: pc.tempHp - fromTemp, hp: Math.max(0, pc.hp - (n - fromTemp)) }, `${pc.name} took ${n} damage`);
    setAmount('');
  };
  const heal = () => { if (n) { savePc(pc, { hp: Math.min(pc.maxHp, pc.hp + n) }, `${pc.name} healed ${n}`); setAmount(''); } };
  const temp = () => { if (n) { savePc(pc, { tempHp: Math.max(pc.tempHp, n) }, `${pc.name} has ${Math.max(pc.tempHp, n)} temp HP`); setAmount(''); } };
  const spend = (key: string, name: string) => {
    const r = spendFeature(pc, key);
    if (r.ok) savePc(pc, { resources: r.value.resources }, `${pc.name}: used ${name}`);
    else notify(r.error);
  };
  const rest = (kind: 'SHORT' | 'LONG') => {
    const next = applyRest(pc, kind);
    savePc(pc, { resources: next.resources, hp: next.hp, tempHp: next.tempHp, highLevelUsed: next.highLevelUsed, exhaustion: next.exhaustion, deathSaves: next.deathSaves }, `${pc.name}: ${kind.toLowerCase()} rest`);
  };

  return (
    <Sheet title={pc.name} actions={<button className="btn sm" onClick={() => nav.open({ type: 'pcEdit', id: pc.id })}>✎ Edit</button>}>
      <p className="small muted">{speciesName(pc)} {c?.name} {pc.level}{pc.specialty ? ` (${pc.specialty})` : ''} · {pc.background} · {pc.district} · {disciplineName(pc.attunement)} <Chip>PLAYTEST</Chip></p>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="row between">
          <div><div className="label">Hit points</div><span className="big-num">{pc.hp}</span><span className="muted"> / {pc.maxHp}{pc.tempHp ? ` (+${pc.tempHp} temp)` : ''}</span></div>
          <div className="center"><div className="label">AC</div><strong style={{ fontSize: '1.5rem' }}>{pc.ac}</strong></div>
          <div className="center"><div className="label">PB</div><strong style={{ fontSize: '1.5rem' }}>{fmtMod(pb)}</strong></div>
        </div>
        <div className="hpbar" style={{ margin: '10px 0' }} aria-hidden><i style={{ width: `${Math.max(0, Math.min(100, (pc.hp / Math.max(1, pc.maxHp)) * 100))}%` }} /></div>
        <div className="row">
          <input className="input grow" inputMode="numeric" placeholder="Amount" aria-label="HP amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
          <button className="btn danger" onClick={damage}>Dmg</button>
          <button className="btn" onClick={heal}>Heal</button>
          <button className="btn" onClick={temp}>Temp</button>
        </div>
      </div>

      <div className="card">
        <div className="grid3">
          {ABILITIES.map((a) => <div key={a} className="center"><div className="label">{a}</div><strong>{pc.abilities[a]}</strong> <span className="muted">{fmtMod(abilityMod(pc.abilities[a]))}</span></div>)}
        </div>
        <p className="small muted center" style={{ marginTop: 8 }}>Initiative {fmtMod(abilityMod(pc.abilities.DEX))} · Speed {pc.speed} ft{(() => { const b = physiology(speciesSelectionOf(pc)); return `${b.fly ? ` · fly ${b.fly} ft` : ''}${b.swim ? ` · swim ${b.swim} ft` : ''}${b.climb ? ` · climb ${b.climb} ft` : ''}${b.darkvision ? ` · darkvision ${b.darkvision} ft` : ''} · ${b.size}${b.resistances.length ? ` · resists ${b.resistances.join(', ')}` : ''}${b.naturalArmor ? ` · ${b.naturalArmor}` : ''}`; })()}</p>
        {innateFeatures(speciesSelectionOf(pc), pc.level).filter((f) => f.uses === 0).map((f) => <p key={f.id} className="small" style={{ marginTop: 4 }}><strong>{f.name}</strong> (at will): {f.note}</p>)}
      </div>

      {pc.resources.length > 0 && (
        <div className="card">
          <div className="label">Resources</div>
          {pc.resources.map((r) => (
            <div className="row between" key={r.key} style={{ minHeight: 48, borderTop: '1px solid var(--line)' }}>
              <div className="grow"><div>{r.name}</div><div className="small muted">{r.recovery === 'SHORT_REST' ? 'Short rest' : r.recovery === 'LONG_REST' ? 'Long rest' : 'No automatic recovery'}</div></div>
              <strong>{r.current}/{r.max}</strong>
              {r.key === 'rp' || r.key === 'healer-kit' ? (
                <>
                  <button className="btn sm" aria-label={`Spend 1 ${r.name}`} onClick={() => savePc(pc, { resources: adjustResource(pc, r.key, -1).resources }, `${pc.name}: ${r.name} −1`)}>−</button>
                  <button className="btn sm" aria-label={`Restore 1 ${r.name}`} onClick={() => savePc(pc, { resources: adjustResource(pc, r.key, 1).resources }, `${pc.name}: ${r.name} +1`)}>+</button>
                </>
              ) : r.key === 'amp' || r.key === 'emergency' ? (
                <button className="btn sm" onClick={() => nav.open({ type: 'cast', id: pc.id })}>Cast…</button>
              ) : (
                <button className="btn sm" disabled={r.current < 1} onClick={() => spend(r.key, r.name)}>Use</button>
              )}
            </div>
          ))}
        </div>
      )}

      {pc.classId === 'resonant' && (
        <button className="btn primary block" style={{ marginBottom: 10 }} onClick={() => nav.open({ type: 'cast', id: pc.id })}>✦ Patterns &amp; overcasting assistant</button>
      )}
      {pc.classId === 'machinist' && (
        <div className="card">
          <div className="label">Field Rig · {pc.rigIds.length}/{deviceSlots(pc.level)} devices prepared</div>
          {DEVICES.filter((d) => pc.rigIds.includes(d.id)).map((d) => <p key={d.id} className="small" style={{ marginBottom: 6 }}><strong>{d.name}</strong> — <em>{d.actionText}.</em> {d.effectMd}</p>)}
          {!pc.rigIds.length && <p className="small muted">Choose devices in Edit (changed at the end of a long rest).</p>}
        </div>
      )}

      <div className="grid2" style={{ marginBottom: 10 }}>
        <ConfirmBtn confirm="Take a short rest?" onConfirm={() => rest('SHORT')}>☕ Short rest</ConfirmBtn>
        <ConfirmBtn confirm="Take a long rest?" onConfirm={() => rest('LONG')}>🌙 Long rest</ConfirmBtn>
      </div>

      <div className="card">
        <div className="label">Conditions</div>
        <div className="row wrap">
          {CONDITIONS.map((cond) => {
            const on = pc.conditions.includes(cond);
            return <button key={cond} className={`btn sm ${on ? 'primary' : 'ghost'}`} aria-pressed={on} onClick={() => savePc(pc, { conditions: on ? pc.conditions.filter((x) => x !== cond) : [...pc.conditions, cond] })}>{on ? '✓ ' : ''}{cond}</button>;
          })}
        </div>
        <hr />
        <div className="grid3">
          <Stepper label="Exhaustion" value={pc.exhaustion} onChange={(d) => savePc(pc, { exhaustion: Math.max(0, Math.min(6, pc.exhaustion + d)) })} />
          <Stepper label="Death ✓" value={pc.deathSaves.successes} onChange={(d) => savePc(pc, { deathSaves: { ...pc.deathSaves, successes: Math.max(0, Math.min(3, pc.deathSaves.successes + d)) } })} />
          <Stepper label="Death ✕" value={pc.deathSaves.failures} onChange={(d) => savePc(pc, { deathSaves: { ...pc.deathSaves, failures: Math.max(0, Math.min(3, pc.deathSaves.failures + d)) } })} />
        </div>
      </div>

      <button className="btn block" onClick={() => setShowFeatures(!showFeatures)} aria-expanded={showFeatures}>{showFeatures ? 'Hide' : 'Show'} class features (level {pc.level})</button>
      {showFeatures && featuresFor(pc).filter((f) => f.name !== 'ASI').map((f) => (
        <div className="card" key={f.id} style={{ marginTop: 8 }}>
          <div className="row between"><strong>{f.name}</strong><span className="small muted">Lv {f.level}{f.actionEconomy ? ` · ${f.actionEconomy.toLowerCase().replace('_', ' ')}` : ''}</span></div>
          <p className="small" style={{ marginTop: 4 }}>{f.rulesMd}</p>
        </div>
      ))}

      <div style={{ height: 10 }} />
      <TextField label="Inventory" area value={pc.inventoryMd} onSave={(v) => savePc(pc, { inventoryMd: v })} />
      <TextField label="Connections" area value={pc.connectionsMd} onSave={(v) => savePc(pc, { connectionsMd: v })} />
      <TextField label="Notes (shareable with the player)" area tone="safe" value={pc.notesMd} onSave={(v) => savePc(pc, { notesMd: v })} />
      <TextField label="Secrets & DM notes" area tone="private" value={pc.privateNotesMd} onSave={(v) => savePc(pc, { privateNotesMd: v })} />
    </Sheet>
  );
}

export function PcEditSheet({ id }: { id: string }) {
  const pc = useRow<PC>('pcs', id);
  const nav = useNav();
  if (!pc) return <Sheet title="Edit character">…</Sheet>;
  // Any change that affects derived resources re-syncs them from the class data.
  const structural = (patch: Partial<PC>) => {
    const next = { ...pc, ...patch };
    if (next.classId !== 'resonant') { next.patternIds = []; next.preparedIds = []; }
    if (next.classId !== 'machinist') next.rigIds = [];
    next.rigIds = next.rigIds.slice(0, deviceSlots(next.level));
    savePc(pc, { ...patch, patternIds: next.patternIds, preparedIds: next.preparedIds, rigIds: next.rigIds, resources: syncResources(next) });
  };
  const num = (v: string, min = 0, max = 999) => Math.max(min, Math.min(max, parseInt(v, 10) || 0));
  return (
    <Sheet title="Edit character">
      <TextField label="Name" value={pc.name} onSave={(v) => savePc(pc, { name: v })} />
      <TextField label="Player" value={pc.player} onSave={(v) => savePc(pc, { player: v })} />
      <details className="card">
        <summary><strong>Species:</strong> {speciesName(pc)} <span className="small muted">(tap to change)</span></summary>
        <p className="small muted" style={{ margin: '6px 0' }}>Changing species re-applies nothing to stored ability scores: adjust them below if the bonuses change.</p>
        <SpeciesPicker level={pc.level} value={speciesSelectionOf(pc)} onChange={(sp) => structural({ species: sp, ancestry: speciesById(sp.entryId)?.name ?? pc.ancestry, speed: physiology(sp).speed })} />
        {speciesById(speciesSelectionOf(pc).entryId)?.status === 'SOURCE_NEEDED' && (
          <label className="row" style={{ minHeight: 44 }}><input type="checkbox" checked={!!pc.species?.dmApproved} onChange={(e) => structural({ species: { ...speciesSelectionOf(pc), dmApproved: e.target.checked } })} /><span>DM has checked these traits against the book</span></label>
        )}
      </details>
      <SelectField label="Class (PLAYTEST)" value={pc.classId} options={CLASSES.map((c) => ({ value: c.id, label: `${c.name} · d${c.hitDie} · ${c.mainAbility}` }))} onSave={(v) => structural({ classId: v, specialty: '' })} />
      <TextField label="Level" type="number" value={pc.level} onSave={(v) => structural({ level: num(v, 1, 20) })} />
      <TextField label="Specialty / Calling" value={pc.specialty} onSave={(v) => savePc(pc, { specialty: v })} placeholder="e.g. Systems Engineer, Lifesaver, Hunter" />
      <SelectField label="Background" value={pc.background} options={BACKGROUNDS.map((b) => ({ value: b.name, label: `${b.name} (${b.skills})` }))} onSave={(v) => savePc(pc, { background: v })} />
      <SelectField label="District" value={pc.district} options={DISTRICTS.map((d) => ({ value: d, label: d }))} onSave={(v) => savePc(pc, { district: v })} />
      <SelectField label="Attunement" value={pc.attunement} options={[{ value: 'UNATTUNED' as const, label: 'Unattuned' }, ...DISCIPLINES.map((d) => ({ value: d.id as Discipline | 'UNATTUNED', label: `Attuned: ${d.name}` }))]}
        onSave={(v) => structural({ attunement: v, patternIds: [], preparedIds: [] })} />
      {pc.classId === 'resonant' && pc.attunement === 'UNATTUNED' && <div className="banner warn">A Resonant must be Attuned to one discipline.</div>}
      {pc.classId !== 'resonant' && pc.attunement !== 'UNATTUNED' && <div className="banner">Attuned without training: no spells. Only the Resonant class casts independently.</div>}

      <div className="label">Ability scores</div>
      <div className="grid3">
        {ABILITIES.map((a) => <TextField key={a} label={`${a} (${fmtMod(abilityMod(pc.abilities[a]))})`} type="number" value={pc.abilities[a]} onSave={(v) => structural({ abilities: { ...pc.abilities, [a]: num(v, 1, 30) } })} />)}
      </div>
      <div className="grid3">
        <TextField label="Max HP" type="number" value={pc.maxHp} onSave={(v) => savePc(pc, { maxHp: num(v, 1), hp: Math.min(pc.hp, num(v, 1)) })} />
        <TextField label="Current HP" type="number" value={pc.hp} onSave={(v) => savePc(pc, { hp: num(v, 0, pc.maxHp) })} />
        <TextField label="AC" type="number" value={pc.ac} onSave={(v) => savePc(pc, { ac: num(v) })} />
      </div>
      <TextField label="Speed (ft)" type="number" value={pc.speed} onSave={(v) => savePc(pc, { speed: num(v) })} />
      <p className="small muted">Proficiency bonus at level {pc.level}: {fmtMod(proficiencyBonus(pc.level))} (calculated).</p>

      {pc.classId === 'machinist' && (
        <div className="card">
          <div className="label">Field Rig devices · choose {deviceSlots(pc.level)}</div>
          {DEVICES.map((d) => {
            const on = pc.rigIds.includes(d.id);
            const full = !on && pc.rigIds.length >= deviceSlots(pc.level);
            return (
              <label key={d.id} className="row" style={{ minHeight: 48, opacity: full ? 0.5 : 1 }}>
                <input type="checkbox" checked={on} disabled={full} onChange={() => structural({ rigIds: on ? pc.rigIds.filter((x) => x !== d.id) : [...pc.rigIds, d.id] })} />
                <span><strong>{d.name}</strong> <span className="small muted">— {d.actionText}</span></span>
              </label>
            );
          })}
        </div>
      )}
      {pc.classId === 'votary' && (
        <TextField label="Healer's kit max charges" type="number" value={getRes(pc, 'healer-kit')?.max ?? 10}
          onSave={(v) => savePc(pc, { resources: pc.resources.map((r) => (r.key === 'healer-kit' ? { ...r, max: num(v, 0), current: Math.min(r.current, num(v, 0)) } : r)) })} />
      )}
      <ConfirmBtn className="btn danger block" onConfirm={() => { softDelete('pcs', pc.id, pc.name); nav.close(); nav.close(); }}>Delete character</ConfirmBtn>
    </Sheet>
  );
}

// ---------------- Patterns & overcasting assistant ----------------
export function CastSheet({ id }: { id: string }) {
  const pc = useRow<PC>('pcs', id);
  const [tab, setTab] = useState<'cast' | 'book'>('cast');
  const [patternId, setPatternId] = useState<string>('');
  const [tier, setTier] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [enh, setEnh] = useState<string>('damage');
  const [emergency, setEmergency] = useState(false);
  const [rolled, setRolled] = useState<string>('');
  const book = useMemo(() => (pc?.patternIds ?? []).map(patternById).filter((p): p is Pattern => !!p && p.status === 'MAPPED'), [pc?.patternIds]);
  if (!pc) return <Sheet title="Patterns">…</Sheet>;
  if (pc.classId !== 'resonant') return <Sheet title="Patterns"><Empty>Only the Resonant class casts Patterns.</Empty></Sheet>;

  const pattern = patternById(patternId);
  const rp = getRes(pc, 'rp');
  const amp = getRes(pc, 'amp');
  const emer = getRes(pc, 'emergency');
  const preparedSet = new Set(pc.preparedIds.map(normalizePatternId));
  const castable = book.filter((p) => p.level === 0 || preparedSet.has(p.id));
  const result = pattern ? calcCast(castInputFor(pc, pattern.level, { ampTier: tier, emergency, enhancement: enh })) : null;

  const confirm = () => {
    if (!pattern || !result) return;
    const r = applyCast(pc, result);
    if (!r.ok) return notify(r.error);
    savePc(pc, { resources: r.value.resources, highLevelUsed: r.value.highLevelUsed }, `${pc.name} cast ${pattern.name} (−${result.totalCost} RP)`);
    setTier(0); setEmergency(false); setRolled('');
  };
  const rollStrain = () => {
    if (!result?.strainDice) return;
    const dice = rollDice(result.strainDice, 6);
    setRolled(`${dice.join(' + ')} = ${dice.reduce((a, b) => a + b, 0)} ${result.strainNote}`);
  };

  return (
    <Sheet title={`${pc.name} · Patterns`}>
      <div className="card row between">
        <div><div className="label">RP</div><span className="big-num">{rp?.current ?? 0}</span><span className="muted"> / {rp?.max ?? 0}</span></div>
        <div className="center"><div className="label">Amplify</div><strong>{amp?.current ?? 0}/2</strong></div>
        <div className="center"><div className="label">Emergency</div><strong>{emer?.current ? 'Ready' : 'Used'}</strong></div>
        <div className="center"><div className="label">Max level</div><strong>{maxPatternLevel(pc.level)}</strong></div>
      </div>
      <Seg label="Pattern view" value={tab} onChange={setTab} options={[{ value: 'cast', label: 'Cast' }, { value: 'book', label: `Patternbook (${pc.patternIds.length})` }]} />
      <div style={{ height: 10 }} />

      {tab === 'cast' && <>
        <div className="label">1 · Choose a prepared Pattern ({disciplineName(pc.attunement)})</div>
        <div className="row wrap" style={{ marginBottom: 10 }}>
          {castable.map((p) => (
            <button key={p.id} className={`btn sm ${patternId === p.id ? 'primary' : ''}`} onClick={() => { setPatternId(p.id); setRolled(''); }}>
              {p.name} · {p.level === 0 ? 'cantrip' : `L${p.level}`} · {p.rpCost} RP
            </button>
          ))}
          {!castable.length && <p className="muted small">Nothing prepared. Add Patterns in the Patternbook tab.</p>}
        </div>
        {pattern && result && <>
          <div className="card">
            <strong>{pattern.name}</strong>
            <p className="small muted">{pattern.level === 0 ? 'Cantrip' : `Level ${pattern.level}`} · {pattern.action} · {pattern.range}{pattern.concentration ? ' · concentration' : ''}</p>
            <p className="small muted">{pattern.source}</p>
            {pattern.rulesMd && <details><summary className="small">Rules text</summary><Md className="small" text={pattern.rulesMd + (pattern.upcastMd ? `\n\n**At higher levels.** ${pattern.upcastMd}` : '')} /></details>}
          </div>
          <div className="label">2 · Amplified Overcasting (optional, {amp?.current ?? 0} left)</div>
          <Seg label="Amplification tier" value={String(tier)} onChange={(v) => { setTier(Number(v) as 0); if (Number(v)) setEmergency(false); setRolled(''); }}
            options={[{ value: '0', label: 'None' }, ...AMP_TIERS.map((t) => ({ value: String(t.tier), label: `+${t.tier}` }))]} />
          {tier > 0 && <>
            <div style={{ height: 8 }} />
            <Seg label="Enhancement" value={enh} onChange={setEnh} options={AMP_ENHANCEMENTS.map((e) => ({ value: e.id, label: e.label }))} />
            <p className="small" style={{ margin: '8px 2px' }}>One enhancement only: {AMP_ENHANCEMENTS.find((e) => e.id === enh)?.text(tier)}</p>
          </>}
          <label className="row" style={{ minHeight: 48, marginTop: 6 }}>
            <input type="checkbox" checked={emergency} onChange={(e) => { setEmergency(e.target.checked); if (e.target.checked) setTier(0); setRolled(''); }} />
            <span>Emergency Overcasting (borrow up to 2 missing RP)</span>
          </label>

          <div className="card" style={{ borderColor: result.ok ? 'var(--amber)' : 'var(--bad)' }}>
            <div className="label">Result — nothing is spent until you confirm</div>
            <p>Cost: <strong>{result.baseCost}</strong> RP{result.ampCost ? <> + <strong>{result.ampCost}</strong> amplification</> : null}{result.borrowed ? <> ({result.borrowed} borrowed)</> : null} = <strong>{result.totalCost} RP</strong> from the pool → {result.rpAfter} left</p>
            {result.strain && <p>Strain: <strong>{result.strain}</strong> {result.strainNote} · CON save <strong>DC {result.conDc}</strong> or 1 exhaustion</p>}
            {result.usesAmp && <p className="small muted">Uses 1 of {amp?.current ?? 0} Amplification uses.</p>}
            {result.marksHighLevel && <p className="small muted">Level {result.marksHighLevel} Patterns are once per long rest.</p>}
            {result.errors.map((e) => <div key={e} className="banner bad" style={{ marginTop: 8 }}>✕ {e}</div>)}
            {rolled && <div className="banner warn" style={{ marginTop: 8 }}>🎲 {rolled}. Apply the damage and any exhaustion on the character sheet.</div>}
            <div className="grid2" style={{ marginTop: 10 }}>
              <button className="btn" disabled={!result.strain || !result.ok} onClick={rollStrain}>🎲 Roll strain</button>
              <ConfirmBtn className="btn primary" confirm={`Spend ${result.totalCost} RP?`} onConfirm={confirm}>Confirm cast</ConfirmBtn>
            </div>
          </div>
        </>}
      </>}

      {tab === 'book' && <Patternbook pc={pc} />}
    </Sheet>
  );
}

function Patternbook({ pc }: { pc: PC }) {
  const [showAll, setShowAll] = useState(false);
  const [bookOnly, setBookOnly] = useState(false);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<string | null>(null);
  const prepared = pc.preparedIds.length;
  const all = PATTERNS.filter((p) => (showAll || p.discipline === pc.attunement) && (!bookOnly || isKnown(pc, p)) && (p.name + ' ' + (p.publishedName ?? '')).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  const list = all.slice(0, 60);
  const unknown = [...pc.patternIds, ...pc.preparedIds].filter((id) => !patternById(id));
  return (
    <>
      <div className="banner">Book {pc.patternIds.length} Patterns · prepared {prepared}/{prepareLimit(pc)} (level + INT). Cantrips are always ready. The discipline mapping is a PLAYTEST proposal: the DM approves each Pattern. A level-3 Resonant needs ten legal Patterns and three cantrips. The full searchable list is in Library → Resonance Pattern directory.</div>
      {unknown.length > 0 && <div className="banner warn">{unknown.length} saved selection{unknown.length === 1 ? ' is' : 's are'} not in the directory ({[...new Set(unknown)].join(', ')}). They are kept, not deleted.</div>}
      <input className="input" placeholder="Filter by name" aria-label="Filter Patterns" value={q} onChange={(e) => setQ(e.target.value)} />
      <label className="row" style={{ minHeight: 48 }}><input type="checkbox" checked={bookOnly} onChange={(e) => setBookOnly(e.target.checked)} /><span>Only Patterns in the book</span></label>
      <label className="row" style={{ minHeight: 48 }}><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /><span>Show other disciplines (cannot be added)</span></label>
      {list.map((p) => {
        const inBook = isKnown(pc, p);
        const prep = isPrepared(pc, p);
        return (
          <div className="card" key={p.id}>
            <div className="row between"><strong>{p.name}</strong><span className="small muted">{disciplineName(p.discipline)} · {p.level === 0 ? 'cantrip' : `L${p.level}`} · {RP_COST[p.level]} RP</span></div>
            <p className="small muted">{p.action} · {p.range}{p.concentration ? ' · concentration' : ''} · <button className="btn sm ghost" onClick={() => setDetail(detail === p.id ? null : p.id)}>{detail === p.id ? 'Hide' : 'Details'}</button></p>
            {detail === p.id && <PatternCard p={p} />}
            <div className="grid2" style={{ marginTop: 8 }}>
              <button className={`btn sm ${inBook ? 'primary' : ''}`} onClick={() => toggleBook(pc, p)}>{inBook ? '✓ In book' : 'Add to book'}</button>
              <button className={`btn sm ${prep ? 'primary' : ''}`} disabled={!inBook || p.level === 0} onClick={() => togglePrep(pc, p)}>{p.level === 0 ? 'Always ready' : prep ? '✓ Prepared' : 'Prepare'}</button>
            </div>
          </div>
        );
      })}
      {all.length > list.length && <p className="small muted center">Showing {list.length} of {all.length}. Narrow the filter.</p>}
      {!list.length && <Empty>No Patterns match.</Empty>}
      <Md className="small muted" text="SRD 5.1 entries include licensed rules text (CC-BY-4.0). PHB-only entries list name and level only." />
    </>
  );
}
