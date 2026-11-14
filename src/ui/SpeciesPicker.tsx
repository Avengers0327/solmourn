// Species selection (Divergence amendment). Player-safe: shows rules and sources only, never the
// DM-only origin mapping. One species rules package per character.
import { useMemo, useState } from 'react';
import { SPECIES, SRD_TRAITS, speciesById, speciesCoverage, type InnateFeature, type SpeciesEntry } from '../content/species';
import { blankManual, innateFeatures, physiology, validateSpecies, type ManualSpecies, type SpeciesSelection } from '../domain/species';
import type { Ability } from '../domain/types';
import { Chip, Md, Seg } from './kit';

const ABILITIES: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const STATUS_LABEL: Record<SpeciesEntry['status'], string> = { IMPLEMENTED: 'Rules built in', SOURCE_NEEDED: 'Enter from your book', NOT_SUPPORTED: '2024: not used' };

function ManualForm({ m, onChange }: { m: ManualSpecies; onChange: (m: ManualSpecies) => void }) {
  const num = (k: keyof ManualSpecies, label: string) => (
    <label className="field" style={{ marginBottom: 6 }}><span>{label}</span>
      <input className="input" inputMode="numeric" value={String(m[k] ?? 0)} onChange={(e) => onChange({ ...m, [k]: Math.max(0, Math.min(120, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)) })} /></label>
  );
  const setInnate = (i: number, patch: Partial<InnateFeature>) => onChange({ ...m, innate: m.innate.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div className="label">Traits from your book (entered by hand, DM reviews them)</div>
      <label className="field"><span>Book and page</span><input className="input" value={m.bookRef} placeholder="e.g. Eberron: Rising from the Last War, p. 35" onChange={(e) => onChange({ ...m, bookRef: e.target.value })} /></label>
      <div className="label">Ability adjustments (2014-era: each -2 to +2, total +3 at most)</div>
      <div className="grid3">
        {ABILITIES.map((a) => (
          <label key={a} className="field" style={{ marginBottom: 6 }}><span>{a}</span>
            <select className="input" value={String(m.asi[a] ?? 0)} onChange={(e) => onChange({ ...m, asi: { ...m.asi, [a]: Number(e.target.value) } })}>
              {[-2, -1, 0, 1, 2].map((n) => <option key={n} value={n}>{n > 0 ? `+${n}` : n}</option>)}
            </select></label>
        ))}
      </div>
      <label className="field"><span>Size</span>
        <select className="input" value={m.size} onChange={(e) => onChange({ ...m, size: e.target.value as ManualSpecies['size'] })}>{['Small', 'Medium', 'Tiny'].map((s) => <option key={s}>{s}</option>)}</select></label>
      <div className="grid3">{num('speed', 'Walk ft')}{num('fly', 'Fly ft')}{num('swim', 'Swim ft')}{num('climb', 'Climb ft')}{num('darkvision', 'Darkvision ft')}</div>
      <label className="field"><span>Resistances (comma-separated)</span><input className="input" value={m.resistances} onChange={(e) => onChange({ ...m, resistances: e.target.value })} /></label>
      <label className="field"><span>Natural armor / AC rule, if any</span><input className="input" value={m.naturalArmor} onChange={(e) => onChange({ ...m, naturalArmor: e.target.value })} /></label>
      <label className="field"><span>Other traits (your own short notes, not book text)</span><textarea className="input" rows={3} value={m.traitsMd} onChange={(e) => onChange({ ...m, traitsMd: e.target.value })} /></label>
      <div className="label">Limited-use or innate features</div>
      {m.innate.map((f, i) => (
        <div key={i} className="card" style={{ padding: 8 }}>
          <input className="input" aria-label="Feature name" placeholder="Feature name" value={f.name} onChange={(e) => setInnate(i, { name: e.target.value })} />
          <div className="grid3" style={{ marginTop: 6 }}>
            <label className="field" style={{ marginBottom: 0 }}><span>Uses (0 = at will)</span><input className="input" inputMode="numeric" value={String(f.uses)} onChange={(e) => setInnate(i, { uses: Math.min(10, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0) })} /></label>
            <label className="field" style={{ marginBottom: 0 }}><span>Recovers on</span>
              <select className="input" value={f.recovery} onChange={(e) => setInnate(i, { recovery: e.target.value as InnateFeature['recovery'] })}><option value="LONG_REST">Long rest</option><option value="SHORT_REST">Short rest</option><option value="NONE">Never</option></select></label>
            <label className="field" style={{ marginBottom: 0 }}><span>From level</span><input className="input" inputMode="numeric" value={String(f.minLevel)} onChange={(e) => setInnate(i, { minLevel: Math.max(1, parseInt(e.target.value.replace(/\D/g, ''), 10) || 1) })} /></label>
          </div>
          <button className="btn sm ghost" onClick={() => onChange({ ...m, innate: m.innate.filter((_, j) => j !== i) })}>Remove</button>
        </div>
      ))}
      <button className="btn sm" onClick={() => onChange({ ...m, innate: [...m.innate, { id: `manual-${m.innate.length + 1}`, name: '', uses: 1, recovery: 'LONG_REST', minLevel: 1, action: 'As printed', note: 'Printed limited use. Uses no RP.' }] })}>+ Add feature</button>
      <p className="small muted" style={{ marginTop: 6 }}>If a trait in your book uses spell slots, agree a conversion with the DM. The app never charges or grants Resonance Points for species features.</p>
    </div>
  );
}

export function SpeciesPicker({ value, onChange, level = 3 }: { value: SpeciesSelection; onChange: (s: SpeciesSelection) => void; level?: number }) {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<'ALL' | SpeciesEntry['status']>('ALL');
  const entry = speciesById(value.entryId);
  const list = useMemo(() => SPECIES.filter((s) => (tier === 'ALL' || s.status === tier) && (s.name + ' ' + s.sourceTitle + ' ' + s.sourceCode).toLowerCase().includes(q.toLowerCase())), [q, tier]);
  const cov = speciesCoverage();
  const errors = validateSpecies(value);
  const body = physiology(value);
  const choose = (s: SpeciesEntry) => onChange({ entryId: s.id, heritageNote: value.heritageNote, manual: s.status === 'SOURCE_NEEDED' ? value.manual ?? blankManual() : undefined });
  return (
    <div>
      <p className="small muted">Any official D&D species. In Solmourn every people descends from Earth's humanity through centuries of change called the Divergence. Species never decides class, district or loyalty.</p>
      <input className="input" style={{ marginTop: 8 }} placeholder="Search species or book" aria-label="Search species" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ height: 6 }} />
      <Seg label="Rules availability" value={tier} onChange={setTier} options={[{ value: 'ALL', label: 'All' }, { value: 'IMPLEMENTED', label: `Built in (${cov.implemented})` }, { value: 'SOURCE_NEEDED', label: `From your book (${cov.sourceNeeded})` }]} />
      <select className="input" style={{ marginTop: 6 }} aria-label="Species" value={value.entryId} onChange={(e) => { const s = speciesById(e.target.value); if (s) choose(s); }}>
        {list.map((s) => <option key={s.id} value={s.id} disabled={s.status === 'NOT_SUPPORTED'}>{s.name} · {s.sourceCode}{s.edition === '2024' ? ' (2024, not used)' : ''}</option>)}
        {!list.some((s) => s.id === value.entryId) && entry && <option value={entry.id}>{entry.name} · {entry.sourceCode}</option>}
      </select>
      {entry && (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="row wrap"><strong>{entry.name}</strong><Chip>{entry.sourceTitle}</Chip><Chip>{entry.edition}</Chip><Chip tone={entry.status === 'IMPLEMENTED' ? 'amber' : ''}>{STATUS_LABEL[entry.status]}</Chip></div>
          <p className="small muted" style={{ marginTop: 4 }}>{entry.license}</p>
          {entry.status === 'IMPLEMENTED' && <>
            <p className="small" style={{ marginTop: 6 }}><strong>{body.size}</strong> · walk {body.speed} ft{body.darkvision ? ` · darkvision ${body.darkvision} ft` : ''}{entry.asi && Object.keys(entry.asi).length ? ` · ${Object.entries(entry.asi).map(([k, v]) => `${k} +${v}`).join(', ')}` : ''}{entry.hpPerLevel ? ` · +${entry.hpPerLevel} HP per level` : ''}</p>
            {entry.asiChoice && (
              <div className="row wrap" style={{ marginTop: 6 }}>
                <span className="small">Choose {entry.asiChoice.choose} for +{entry.asiChoice.bonus}:</span>
                {entry.asiChoice.from.map((a) => {
                  const picks = value.asiPicks ?? [];
                  const on = picks.includes(a);
                  return <button key={a} className={`btn sm ${on ? 'primary' : 'ghost'}`} aria-pressed={on} disabled={!on && picks.length >= entry.asiChoice!.choose} onClick={() => onChange({ ...value, asiPicks: on ? picks.filter((x) => x !== a) : [...picks, a] })}>+{entry.asiChoice!.bonus} {a}</button>;
                })}
              </div>
            )}
            {entry.choice && (
              <label className="field" style={{ marginTop: 8 }}><span>{entry.choice.label}</span>
                <select className="input" value={value.choiceId ?? ''} onChange={(e) => onChange({ ...value, choiceId: e.target.value || undefined })}>
                  <option value="">Choose…</option>
                  {entry.choice.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select></label>
            )}
            {entry.id === 'phb-variant-human' && <p className="small muted">Also one extra skill and one feat your DM approves (PHB 2014). Record them in notes.</p>}
            <details style={{ marginTop: 6 }}>
              <summary className="small">Traits</summary>
              {(entry.traitIds ?? []).map((t) => SRD_TRAITS[t] && <div key={t} style={{ marginTop: 6 }}><strong className="small">{SRD_TRAITS[t].n}</strong><Md className="small" text={SRD_TRAITS[t].x} /></div>)}
              {!entry.traitIds?.length && <p className="small muted">No special traits beyond the ability increases.</p>}
            </details>
          </>}
          {entry.status === 'SOURCE_NEEDED' && <ManualForm m={value.manual ?? blankManual()} onChange={(m) => onChange({ ...value, manual: m })} />}
          {innateFeatures(value, level).length > 0 && (
            <div className="small" style={{ marginTop: 8 }}><strong>Innate features at level {level}</strong> (species features: they never use or grant Resonance Points or Patterns):
              <ul style={{ paddingLeft: 18, margin: '4px 0' }}>{innateFeatures(value, level).map((f) => <li key={f.id}>{f.name || 'Unnamed'} — {f.uses ? `${f.uses}/${f.recovery === 'SHORT_REST' ? 'short rest' : f.recovery === 'LONG_REST' ? 'long rest' : 'ever'}` : 'at will'}. {f.note}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      <label className="field" style={{ marginTop: 8 }}><span>Mixed heritage (description only; one rules package)</span>
        <input className="input" value={value.heritageNote ?? ''} placeholder="Optional" onChange={(e) => onChange({ ...value, heritageNote: e.target.value })} /></label>
      {errors.map((e) => <div key={e} className="banner bad">✕ {e}</div>)}
    </div>
  );
}
