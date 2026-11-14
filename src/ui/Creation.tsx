// Level-3 character creation walkthrough with live validation. Spoiler-safe: it uses only
// player-facing rules data, so it can be done with the player looking at the screen.
import { useState } from 'react';
import { CLASSES, COMMON_GEAR, classById } from '../content/classes';
import { BACKGROUNDS, DISCIPLINES, DISTRICTS, POINT_BUY_BUDGET, STANDARD_ARRAY, backgroundSkills } from '../content/rules';
import { blankPc } from '../data/blank';
import { create } from '../data/repo';
import { ABILITIES, derive, pointBuyCost, validateDraft, type Draft } from '../domain/creation';
import { abilityMod, fmtMod, syncResources } from '../domain/rules';
import type { Ability, Discipline, PC } from '../domain/types';
import { physiology } from '../domain/species';
import { Seg, Sheet } from './kit';
import { SpeciesPicker } from './SpeciesPicker';
import { useNav } from './state';

const RING_OF: Record<string, string> = { 'Crown Scion': 'Imperial Crown', 'Gilded Citizen': 'Gilded Ring', 'Ward Resident': 'Inner Wards', 'Foundry Worker': 'Foundries', 'Frostward Survivor': 'Frostward' };
const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div className="card"><div className="label">Step {n} · {title}</div>{children}</div>
);

export function CreationSheet() {
  const nav = useNav();
  const [d, setD] = useState<Draft>({
    name: '', species: { entryId: 'srd-human' }, classId: 'warden', method: 'ARRAY', base: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
    background: 'Frostward Survivor', classSkills: [], attunement: 'UNATTUNED', reasonInFrostward: '', linkToPc: '',
  });
  const [extra, setExtra] = useState({ player: '', goal: '', cares: '', secret: '', ac: '14' });
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const c = classById(d.classId)!;
  const errors = validateDraft(d);
  const v = derive(d);
  const bg = backgroundSkills(d.background);
  const text = (label: string, value: string, on: (v: string) => void, placeholder = '') => (
    <label className="field"><span>{label}</span><input className="input" value={value} placeholder={placeholder} onChange={(e) => on(e.target.value)} /></label>
  );

  const finish = async () => {
    if (errors.length) return;
    const pc = {
      ...blankPc(), name: d.name.trim(), player: extra.player, ancestry: v.speciesName, species: d.species, speed: physiology(d.species).speed, classId: d.classId, level: 3, background: d.background,
      district: RING_OF[d.background] ?? 'Frostward', attunement: d.attunement, abilities: v.scores, hp: v.hp, maxHp: v.hp, ac: parseInt(extra.ac, 10) || 10,
      skills: v.skills, inventoryMd: `${c.loadoutMd}\n${COMMON_GEAR}`, connectionsMd: `Link to another PC: ${d.linkToPc}\nCares about: ${extra.cares}`,
      notesMd: `Goal: ${extra.goal}\nIn Frostward because: ${d.reasonInFrostward}\nSkills: ${v.skills.join(', ')}`,
      privateNotesMd: extra.secret ? `Secret: ${extra.secret}` : '',
    } as Omit<PC, 'id' | 'campaignId' | 'createdAt' | 'updatedAt' | 'revision'>;
    pc.resources = syncResources({ ...(pc as PC), resources: [] });
    const id = await create('pcs', 'pc', pc, { summary: `Created ${pc.name}`, undoable: true });
    nav.close();
    nav.open({ type: 'pc', id });
  };

  return (
    <Sheet title="New character · level 3">
      <div className="banner">Player-safe walkthrough. Classes and Resonance are PLAYTEST. The full guide is in Library → Character Creation Guide.</div>
      <Step n={1} title="Who">
        {text('Character name', d.name, (x) => set({ name: x }))}
        {text('Player', extra.player, (x) => setExtra({ ...extra, player: x }))}
      </Step>
      <Step n={2} title="Species">
        <SpeciesPicker value={d.species} onChange={(sp) => set({ species: sp })} />
      </Step>
      <Step n={3} title="Class">
        <Seg label="Class" value={d.classId} onChange={(id) => set({ classId: id, classSkills: [], attunement: id === 'resonant' && d.attunement === 'UNATTUNED' ? 'RADIANCE' : d.attunement })} options={CLASSES.map((x) => ({ value: x.id, label: x.name }))} />
        <p className="small" style={{ marginTop: 8 }}><strong>{c.name}</strong> · d{c.hitDie} · {c.mainAbility}. {c.summary}</p>
      </Step>
      <Step n={4} title="Ability scores">
        <Seg label="Score method" value={d.method} onChange={(m) => set({ method: m })} options={[{ value: 'ARRAY', label: `Standard array` }, { value: 'POINT_BUY', label: `Point buy (${POINT_BUY_BUDGET})` }]} />
        <p className="small muted" style={{ margin: '6px 0' }}>{d.method === 'ARRAY' ? `Assign ${STANDARD_ARRAY.join(', ')} once each.` : `Spent ${Number.isFinite(pointBuyCost(d.base)) ? pointBuyCost(d.base) : '—'} of ${POINT_BUY_BUDGET}. Scores 8-15.`}</p>
        <div className="grid3">
          {ABILITIES.map((a: Ability) => (
            <label className="field" key={a} style={{ marginBottom: 6 }}>
              <span>{a} → {v.scores[a]} ({fmtMod(abilityMod(v.scores[a]))})</span>
              <select className="input" value={d.base[a]} onChange={(e) => set({ base: { ...d.base, [a]: Number(e.target.value) } })}>
                {(d.method === 'ARRAY' ? STANDARD_ARRAY : [8, 9, 10, 11, 12, 13, 14, 15]).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          ))}
        </div>
      </Step>
      <Step n={5} title="Background, ring and skills">
        <label className="field"><span>Background</span>
          <select className="input" value={d.background} onChange={(e) => set({ background: e.target.value, classSkills: d.classSkills.filter((s) => !backgroundSkills(e.target.value).includes(s)) })}>
            {BACKGROUNDS.map((b) => <option key={b.name} value={b.name}>{b.name} · {RING_OF[b.name]} · {b.skills}</option>)}
          </select></label>
        <p className="small muted">From background: {bg.join(', ')}. Ring of birth and current home can differ ({DISTRICTS.length} rings).</p>
        <div className="label" style={{ marginTop: 8 }}>{c.name} skills · choose {c.skillChoices?.count} ({d.classSkills.length} chosen)</div>
        <div className="row wrap">
          {c.skillChoices?.from.map((s) => {
            const on = d.classSkills.includes(s);
            const blocked = bg.includes(s) || (!on && d.classSkills.length >= (c.skillChoices?.count ?? 0));
            return <button key={s} className={`btn sm ${on ? 'primary' : 'ghost'}`} aria-pressed={on} disabled={blocked} onClick={() => set({ classSkills: on ? d.classSkills.filter((x) => x !== s) : [...d.classSkills, s] })}>{on ? '✓ ' : ''}{s}{bg.includes(s) ? ' (background)' : ''}</button>;
          })}
        </div>
      </Step>
      <Step n={6} title="Attunement">
        <label className="field"><span>About one person in a thousand is Attuned</span>
          <select className="input" value={d.attunement} onChange={(e) => set({ attunement: e.target.value as Discipline | 'UNATTUNED' })}>
            <option value="UNATTUNED">Unattuned</option>
            {DISCIPLINES.map((x) => <option key={x.id} value={x.id}>Attuned: {x.name} — {x.domain}</option>)}
          </select></label>
        {d.classId === 'resonant'
          ? <p className="small">Resonant at level 3: 14 RP, Patterns up to level {v.maxPatternLevel}, a Patternbook of {v.patternbookSize}. {v.availablePatterns} level 1-{v.maxPatternLevel} Patterns exist for this discipline; your DM approves your ten on the character sheet.</p>
          : d.attunement !== 'UNATTUNED' && <p className="small muted">Attuned without Resonant training: no Patterns.</p>}
      </Step>
      <Step n={7} title="Why you are here">
        {text('Why are you in Frostward when the lights go out?', d.reasonInFrostward, (x) => set({ reasonInFrostward: x }), 'Delivering parts, visiting family, on shift…')}
        {text('Your link to another PC', d.linkToPc, (x) => set({ linkToPc: x }))}
        {text('One thing you want', extra.goal, (x) => setExtra({ ...extra, goal: x }))}
        {text('One person you care about', extra.cares, (x) => setExtra({ ...extra, cares: x }))}
        {text('One secret (stored DM-only, never exported)', extra.secret, (x) => setExtra({ ...extra, secret: x }))}
      </Step>
      <Step n={8} title="Check and create">
        <p className="small"><strong>{v.speciesName}</strong> · <strong>HP</strong> {v.hp} · <strong>Proficiency</strong> {fmtMod(v.proficiencyBonus)} · <strong>Skills</strong> {v.skills.join(', ') || '—'}</p>
        <p className="small muted"><strong>Loadout:</strong> {c.loadoutMd} {COMMON_GEAR}</p>
        {text('Armor Class (from your chosen armor)', extra.ac, (x) => setExtra({ ...extra, ac: x.replace(/\D/g, '') }))}
        {errors.map((e) => <div key={e} className="banner bad">✕ {e}</div>)}
        {!errors.length && <div className="banner ok">✓ Legal level-3 character.</div>}
        <button className="btn primary block" disabled={errors.length > 0} onClick={finish}>Create character</button>
      </Step>
    </Sheet>
  );
}
