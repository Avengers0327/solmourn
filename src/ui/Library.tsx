import { useMemo, useState } from 'react';
import type { AuditEvent, CanonDecision, CanonRule, Doc, PC, TableName } from '../domain/types';
import { CLASSES, DEVICES } from '../content/classes';
import { AMP_TIERS, BACKGROUNDS, DISCIPLINES, QUICK_DCS, RP_COST, RP_POOL } from '../content/rules';
import { SPELLS } from '../content/spells';
import { SpellDirectory } from './Spells';
import { SPECIES, SPECIES_ATTRIBUTION, speciesCoverage } from '../content/species';
import { maxPatternLevel } from '../domain/rules';
import { runStructuralChecks, runTextRules, type CheckTarget, type Finding } from '../domain/canon';
import { buildDmIndex, search, type SearchHit, type SearchScope } from '../domain/search';
import { update } from '../data/repo';
import { Chip, ConfirmBtn, Empty, Seg, Sheet, TextField, VisChip, pretty } from './kit';
import { useCampaignData, type FullData } from './share';
import { fmtTime, getLocal, setLocal, useNav, useRows, type SheetSpec } from './state';
import { PassphraseSettings } from './Lock';

export function Library() {
  const nav = useNav();
  const docs = useRows<Doc>('docs').sort((a, b) => a.fileName.localeCompare(b.fileName));
  const item = (label: string, sub: string, spec: SheetSpec, icon: string) => (
    <button className="list-item" onClick={() => nav.open(spec)}>
      <span aria-hidden style={{ fontSize: '1.3rem' }}>{icon}</span>
      <div className="grow"><div className="t">{label}</div><div className="s">{sub}</div></div><span className="muted" aria-hidden>›</span>
    </button>
  );
  return (
    <div>
      <button className="input" style={{ textAlign: 'left', color: 'var(--muted)', marginBottom: 12 }} onClick={() => nav.open({ type: 'search' })}>🔍 Search everything…</button>
      <div className="section-title">Documents</div>
      {docs.map((d) => (
        <button key={d.id} className="list-item" onClick={() => nav.open({ type: 'doc', id: d.id })}>
          <div className="grow"><div className="t">{d.title}</div><div className="s">{d.fileName}</div></div><VisChip v={d.visibility} />
        </button>
      ))}
      {!docs.length && <Empty>No documents imported.</Empty>}
      <div className="section-title">Rules</div>
      {item('Rules reference', 'RP, overcasting, DCs, classes, devices (PLAYTEST)', { type: 'rules' }, '📘')}
      {item('Resonance Pattern directory', `${SPELLS.length} entries · ${SPELLS.filter((s) => s.verification === 'SRD_VERIFIED').length} SRD-verified, rest unverified: search, filters, favorites, coverage`, { type: 'spells' }, '✦')}
      {item('Species catalog', `${speciesCoverage().implemented} built in · ${speciesCoverage().sourceNeeded} from your book · source coverage`, { type: 'speciesCatalog' }, '🧬')}
      {item('Stat cards', 'PLAYTEST adversaries and hazards', { type: 'statCards' }, '⚔️')}
      <div className="section-title">Campaign</div>
      {item('DM Academy', 'How to run this campaign: lessons and rehearsals', { type: 'academy' }, '🎓')}
      {item('Campaign state & choices', 'Clocks, trackers and recorded decisions', { type: 'state' }, '🧩')}
      {item('Sessions', 'Prep cards, scenes and notes for all fifteen', { type: 'sessions' }, '🗓')}
      {item('Canon decisions', 'Open questions and what you have locked', { type: 'decisions' }, '⚖️')}
      {item('Consistency checks', 'Warnings with proposed corrections - never automatic', { type: 'checks' }, '🧭')}
      {item('Change history', 'Every canon, reveal and resource change', { type: 'history' }, '🕘')}
      {item('Canon upgrade report', 'What the last seed update changed, kept or flagged', { type: 'seedReport' }, '📋')}
      <div className="section-title">Sharing &amp; safety</div>
      {item('Share with players', 'Spoiler-safe recaps, people, places, sheets', { type: 'share' }, '📤')}
      <button className="list-item" onClick={nav.enterPresenter}>
        <span aria-hidden style={{ fontSize: '1.3rem' }}>📺</span>
        <div className="grow"><div className="t">Presenter mode</div><div className="s">Safe to show the table: player-safe content only</div></div><span className="muted" aria-hidden>›</span>
      </button>
      {item('Backup & restore', 'DM-only full backup to Files; restore', { type: 'backup' }, '💾')}
      {item('Settings', 'DM passphrase, time zone', { type: 'settings' }, '⚙️')}
      {item('App status', 'What is implemented, placeholder or deferred', { type: 'status' }, 'ℹ️')}
    </div>
  );
}

// ---------------- Search ----------------
const KIND_TO_SHEET: Record<string, SheetSpec['type']> = { npc: 'npc', place: 'location', lore: 'lore', clue: 'clue', revelation: 'revelation', session: 'session', note: 'event', timeline: 'timeline', pc: 'pc' };
export function SearchSheet() {
  const nav = useNav();
  const data = useCampaignData();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<SearchScope>('ALL');
  const index = useMemo(() => (data ? buildDmIndex(data) : []), [data]);
  const hits = useMemo(() => search(index, q, scope), [index, q, scope]);
  const open = (h: SearchHit) => {
    if (h.kind === 'doc') return nav.open({ type: 'doc', id: h.id.split('#')[0], find: h.title });
    if (h.kind === 'pattern') return nav.open({ type: 'patterns' });
    if (h.kind === 'feature') return nav.open({ type: 'rules' });
    if (h.kind === 'scene') return nav.open({ type: 'sessions' });
    if (h.kind === 'lesson') return nav.open({ type: 'lesson', id: h.id });
    if (h.kind === 'choice') return nav.open({ type: 'branches' });
    if (h.kind === 'statcard') return nav.open({ type: 'statCards' });
    if (h.kind === 'species') return nav.open({ type: 'speciesCatalog' });
    const type = KIND_TO_SHEET[h.kind];
    if (type) nav.open({ type, id: h.id } as SheetSpec);
  };
  return (
    <Sheet title="Search">
      <input className="input" autoFocus placeholder="A name, a clue, “Radiance level 2”, “what has the party learned?”" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ height: 8 }} />
      <Seg label="Search scope" value={scope} onChange={setScope} options={[{ value: 'ALL', label: 'All' }, { value: 'DM_ONLY', label: '🔒 DM private' }, { value: 'PLAYER_SAFE', label: '✓ Player-safe' }, { value: 'REVEALED', label: '👁 Revealed' }]} />
      <p className="small" style={{ color: 'var(--private)', margin: '8px 2px' }}>🔒 DM search: results include secrets. Use Presenter mode before showing your screen.</p>
      {hits.map((h) => (
        <button key={`${h.kind}:${h.id}`} className="list-item" onClick={() => open(h)}>
          <div className="grow">
            <div className="row wrap"><Chip>{h.kind}</Chip><VisChip v={h.visibility} />{h.status && <Chip tone="amber">{pretty(String(h.status))}</Chip>}</div>
            <div className="t" style={{ marginTop: 4 }}>{h.title}</div>
            {h.section && <div className="small muted">{h.section}</div>}
            <div className="s">{h.snippet}</div>
          </div>
        </button>
      ))}
      {q.trim() && !hits.length && <Empty>No matches.</Empty>}
    </Sheet>
  );
}

// ---------------- Rules ----------------
export function RulesSheet() {
  const [cls, setCls] = useState(CLASSES[0].id);
  const [tab, setTab] = useState<'quick' | 'rp' | 'classes'>('quick');
  const c = CLASSES.find((x) => x.id === cls)!;
  return (
    <Sheet title="Rules reference">
      <div className="banner warn">PLAYTEST homebrew on a 2014 5e base - not official, not balance-tested. Tune between sessions, openly.</div>
      <Seg label="Rules section" value={tab} onChange={setTab} options={[{ value: 'quick', label: 'Quick' }, { value: 'rp', label: 'RP & overcasting' }, { value: 'classes', label: 'Classes' }]} />
      <div style={{ height: 10 }} />
      {tab === 'quick' && <>
        <div className="card"><div className="label">DCs</div>{QUICK_DCS.map((d) => <div key={d.dc} className="row between" style={{ minHeight: 32 }}><span>{d.label}</span><strong>DC {d.dc}</strong></div>)}</div>
        <div className="card"><div className="label">When someone tries something risky</div>
          <ol style={{ margin: 0, paddingLeft: 20 }}><li>Ask intent and method.</li><li>Decide whether a roll is needed at all.</li><li>Pick ability, skill/tool and DC.</li><li>d20 + ability modifier + proficiency if proficient.</li><li>Describe concrete consequences.</li></ol></div>
        <div className="card"><div className="label">Turn</div><p className="small">Movement, one action, at most one bonus action, one reaction per round. One concentration effect at a time; damage forces a CON save (DC 10 or half the damage, whichever is higher). A bonus-action spell limits other casting that turn to a 1-action cantrip. RP does not change that.</p></div>
        <div className="card"><div className="label">Six disciplines</div>{DISCIPLINES.map((d) => <p key={d.id} className="small"><strong>{d.name}:</strong> {d.domain}</p>)}</div>
        <div className="card"><div className="label">Backgrounds</div>{BACKGROUNDS.map((b) => <p key={b.name} className="small"><strong>{b.name}</strong> ({b.skills}) — {b.perk}</p>)}</div>
      </>}
      {tab === 'rp' && <>
        <div className="card"><div className="label">RP cost by Pattern level</div>
          <div className="grid3 small">{RP_COST.map((c2, i) => <span key={i}>{i === 0 ? 'Cantrip' : `Level ${i}`}: <strong>{c2}</strong></span>)}</div>
          <p className="small muted" style={{ marginTop: 8 }}>Levels 6-9: each once per long rest. RP replaces slots - never both.</p></div>
        <div className="card"><div className="label">RP pool &amp; highest Pattern level</div>
          <div className="grid2 small">{RP_POOL.map((r, i) => <span key={i}>Lv {i + 1}: <strong>{r} RP</strong> · max L{maxPatternLevel(i + 1)}</span>)}</div></div>
        <div className="card"><div className="label">Amplified Overcasting · twice per long rest</div>
          {AMP_TIERS.map((t) => <div key={t.tier} className="row between small" style={{ minHeight: 30 }}><strong>+{t.tier}</strong><span>+{t.extraRp} RP</span><span>{t.strainDice}d6 strain</span><span>CON DC {t.conDc}</span></div>)}
          <p className="small muted" style={{ marginTop: 8 }}>Any Pattern, including cantrips and level 9. One bounded enhancement only: never a new power, free energy, or a higher spell level.</p></div>
        <div className="card"><div className="label">Emergency Overcasting · once per long rest</div>
          <p className="small">Borrow up to 2 missing RP. 1d6 unavoidable force damage per borrowed RP. CON save DC 10 + 2 × borrowed or 1 exhaustion. Cannot combine with Amplification.</p></div>
      </>}
      {tab === 'classes' && <>
        <Seg label="Class" value={cls} onChange={setCls} options={CLASSES.map((x) => ({ value: x.id, label: x.name }))} />
        <div className="card" style={{ marginTop: 10 }}>
          <div className="row between"><h3>{c.name}</h3><Chip>{c.playtestStatus}</Chip></div>
          <p className="small muted">d{c.hitDie} · {c.mainAbility} · saves {c.saves}</p>
          <p className="small" style={{ marginTop: 6 }}>{c.summary}</p><p className="small muted" style={{ marginTop: 6 }}>{c.proficienciesMd}</p>
        </div>
        {[...c.features].sort((a, b) => a.level - b.level).map((f) => (
          <div key={f.id} className="card">
            <div className="row between"><strong>{f.name}</strong><span className="small muted">Level {f.level}</span></div>
            {f.name !== 'ASI' && <p className="small" style={{ marginTop: 4 }}>{f.rulesMd}</p>}
          </div>
        ))}
        {c.id === 'machinist' && <><div className="section-title">Field Rig devices</div>{DEVICES.map((d) => <div key={d.id} className="card"><strong>{d.name}</strong><p className="small"><em>{d.actionText}.</em> {d.effectMd}</p></div>)}</>}
      </>}
    </Sheet>
  );
}

export function SpeciesCatalogSheet() {
  const [tier, setTier] = useState<'IMPLEMENTED' | 'SOURCE_NEEDED' | 'NOT_SUPPORTED'>('IMPLEMENTED');
  const cov = speciesCoverage();
  const rows = SPECIES.filter((s) => s.status === tier);
  return (
    <Sheet title="Species catalog">
      <div className="banner private">🔒 DM view: includes the WORKING Divergence origin for each species (amendment §3). Players see only names, books and rules.</div>
      <div className="card small">
        <div><strong>{cov.implemented}</strong> built in: SRD 5.1 rules, verified data, automated traits.</div>
        <div><strong>{cov.sourceNeeded}</strong> other official 2014-era entries, listed from memory and <strong>not verified</strong>. Traits are entered from the table's own book and need your review.</div>
        <div><strong>{cov.notSupported}</strong> 2024 revisions, listed but not selectable (2014 baseline; adopting them is OPEN).</div>
        <div className="muted" style={{ marginTop: 4 }}>Unlicensed rules text is never stored. Unearthed Arcana, homebrew and third-party species need separate approval.</div>
      </div>
      <Seg label="Species tier" value={tier} onChange={setTier} options={[{ value: 'IMPLEMENTED', label: 'Built in' }, { value: 'SOURCE_NEEDED', label: 'From the book' }, { value: 'NOT_SUPPORTED', label: '2024' }]} />
      <div style={{ height: 8 }} />
      {rows.map((s) => (
        <div className="card" key={s.id}>
          <div className="row between"><strong>{s.name}</strong><Chip>{s.sourceCode}{s.edition === '2024' ? ' 2024' : ''}</Chip></div>
          <p className="small muted">{s.sourceTitle} · {s.license}</p>
          {s.originFamily && <p className="small" style={{ marginTop: 4 }}><span className="chip private">WORKING origin</span> {s.originFamily}</p>}
        </div>
      ))}
      <p className="small muted">{SPECIES_ATTRIBUTION}</p>
    </Sheet>
  );
}

export function SpellsSheet() {
  const pcs = useRows<PC>('pcs');
  return <Sheet title="Resonance Pattern directory"><SpellDirectory pcs={pcs} /></Sheet>;
}

// ---------------- Consistency checks ----------------
function targetsFrom(d: FullData): CheckTarget[] {
  const out: CheckTarget[] = [];
  const add = (table: TableName, rows: { id: string; deletedAt?: string }[], label: (r: never) => string, fields: string[]) => {
    for (const r of rows) {
      if (r.deletedAt) continue;
      // Untouched text extracted from the canonical bible IS the authority; do not lint it.
      const meta = r as unknown as { sourceRef?: string; revision?: number };
      if (meta.sourceRef?.startsWith('SOLMOURN_CANONICAL') && (meta.revision ?? 1) === 1) continue;
      for (const f of fields) {
        const text = (r as unknown as Record<string, unknown>)[f];
        if (typeof text === 'string' && text) out.push({ table, id: r.id, label: label(r as never), field: f, text });
      }
    }
  };
  const t = (r: { title: string }) => r.title;
  const n = (r: { name: string }) => r.name;
  add('lore', d.lore, t, ['title', 'bodyMd', 'playerMd']);
  add('timeline', d.timeline, t, ['title', 'bodyMd', 'playerMd']);
  add('npcs', d.npcs, n, ['publicInfoMd', 'privateInfoMd', 'knowsMd', 'mistakenBeliefsMd', 'wants', 'fears']);
  add('locations', d.locations, n, ['bodyMd', 'playerMd']);
  add('clues', d.clues, t, ['title', 'privateTextMd', 'playerTextMd']);
  add('revelations', d.revelations, t, ['title', 'privateTruthMd', 'playerSafeSummaryMd']);
  add('sessions', d.sessions, t, ['dmNotesMd', 'playerRecapMd']);
  add('scenes', d.scenes, t, ['descriptionMd', 'readAloudMd']);
  add('events', d.events, (r: { textMd: string }) => r.textMd.slice(0, 40), ['textMd']);
  return out;
}
const SHEET_FOR: Partial<Record<TableName, SheetSpec['type']>> = { lore: 'lore', timeline: 'timeline', npcs: 'npc', locations: 'location', clues: 'clue', revelations: 'revelation', sessions: 'session', events: 'event', canonDecisions: 'decision', pcs: 'pcEdit' };

export function ChecksSheet() {
  const nav = useNav();
  const data = useCampaignData();
  const rules = useRows<CanonRule>('canonRules');
  const decisions = useRows<CanonDecision>('canonDecisions');
  const pcs = useRows<PC>('pcs');
  const findings: Finding[] = useMemo(() => (data ? [...runStructuralChecks(decisions, pcs), ...runTextRules(rules, targetsFrom(data))] : []), [data, rules, decisions, pcs]);
  const fix = async (f: Finding) => {
    if (!f.replace || !data) return;
    const rec = (data as unknown as Record<string, { id: string }[]>)[f.table]?.find((r) => r.id === f.id) as unknown as Record<string, string> | undefined;
    if (!rec) return;
    await update(f.table, f.id, { [f.field]: rec[f.field].split(f.replace.from).join(f.replace.to) } as never, { summary: `Canon fix: “${f.replace.from}” → “${f.replace.to}” in ${f.label}`, undoable: true, eventType: 'canon-fix' });
  };
  return (
    <Sheet title="Consistency checks">
      <p className="small muted" style={{ marginBottom: 10 }}>{rules.length} text rules plus structural checks run against your editable records. These are warnings with proposed corrections; nothing changes unless you confirm, and every fix is logged.</p>
      {findings.map((f, i) => (
        <div className="card" key={i}>
          <div className="row wrap"><Chip tone={f.severity === 'error' ? 'bad' : 'amber'}>{f.severity === 'error' ? '✕ Error' : '⚠ Warning'}</Chip><span className="small muted">{f.label} · {f.field}</span></div>
          <p style={{ margin: '6px 0' }}>{f.message}</p>
          <p className="small muted">Evidence: “{f.evidence}”</p>
          <p className="small" style={{ color: 'var(--ok)', marginTop: 4 }}>Proposed: {f.suggestion}</p>
          <div className="grid2" style={{ marginTop: 8 }}>
            {SHEET_FOR[f.table] ? <button className="btn sm" onClick={() => nav.open({ type: SHEET_FOR[f.table]!, id: f.id } as SheetSpec)}>Open record</button> : <span />}
            {f.replace ? <ConfirmBtn className="btn sm" confirm="Apply this correction?" onConfirm={() => fix(f)}>Apply correction</ConfirmBtn> : <span />}
          </div>
        </div>
      ))}
      {data && !findings.length && <div className="banner ok">✓ No conflicts found in your records.</div>}
      {!rules.length && <div className="banner">No campaign rule set loaded.</div>}
    </Sheet>
  );
}

export function HistorySheet() {
  const rows = (useRows<AuditEvent>('audit') as AuditEvent[]).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 200);
  return (
    <Sheet title="Change history">
      {rows.map((a) => (
        <div key={a.id} className="card">
          <div className="row between"><Chip>{a.eventType}</Chip><span className="small muted">{fmtTime(a.timestamp)} · {a.actor}</span></div>
          <p style={{ marginTop: 4 }}>{a.summary}</p><p className="small muted">{a.entityType}</p>
        </div>
      ))}
      {!rows.length && <Empty>No changes recorded yet.</Empty>}
    </Sheet>
  );
}

// ---------------- Settings ----------------
export function SettingsSheet() {
  const [local, setL] = useState(getLocal());
  const save = (patch: Parameters<typeof setLocal>[0]) => { setLocal(patch); setL(getLocal()); };
  return (
    <Sheet title="Settings">
      <PassphraseSettings />
      <div className="card">
        <TextField label="Time zone for timestamps (blank = this device)" value={local.timeZone ?? ''} placeholder="e.g. America/New_York" onSave={(v) => save({ timeZone: v.trim() || undefined })} />
        <p className="small muted">Times are stored in UTC and shown in this zone. Now: {fmtTime(new Date().toISOString())}</p>
      </div>
      <div className="card"><div className="label">Privacy</div><p className="small">No accounts, no analytics, no network calls. Nothing is sent to any AI service. The app sends no notifications.</p></div>
    </Sheet>
  );
}

const STATUS: [string, string[]][] = [
  ['Implemented', [
    'Offline storage with schema migrations, audit history and undo', 'Session cockpit: scenes, read-aloud, clocks, quick notes, safety pause',
    'Preloaded 15-session campaign; seed upgrades that keep your edits and played sessions', 'NPCs, places, lore, world history, at-table history',
    'Clue and revelation tracker with two-tap “mark found”', 'Party sheets, data-driven class resources, short and long rests',
    'Pattern directory (SRD 5.1 text), Patternbook legality, overcasting calculator', 'Character creation walkthrough with validation', 'DM Academy lessons linked from the cockpit', 'Branch choices and campaign state trackers', 'Initiative tracker and dice roller',
    'Group technique tracker (when a campaign pack provides its rules)', 'Player-safe exports with preview and spoiler scan; Presenter mode',
    'Canon decision board and consistency checks', 'Full backup and restore via the share sheet',
  ]],
  ['Placeholder', [
    'All 15 session prep cards, clues, branches and stat cards are WORKING drafts for you to edit', 'PHB-only spells are listed by name without rules text; other 2014-era books are not inventoried',
    'Discipline mapping, exclusions and 12 original Patterns await your approval', 'Player-safe wording is a draft for you to edit', 'Hit Dice are not tracked',
  ]],
  ['Deferred', [
    'Native iOS build (this is an installable web app)', 'PDF export, camera attachments, portraits, widgets', 'Cloud sync and player accounts', 'Semantic search and any AI assistance', 'Face ID (a passcode is used instead)',
  ]],
];
export function StatusSheet() {
  return (
    <Sheet title="App status">
      <div className="banner">Solmourn Companion {__APP_VERSION__} · installable offline web app (PWA), not a native iOS app.</div>
      {STATUS.map(([h, items]) => <div className="card" key={h}><div className="label">{h}</div><ul style={{ margin: 0, paddingLeft: 18 }}>{items.map((x) => <li key={x} className="small" style={{ marginTop: 4 }}>{x}</li>)}</ul></div>)}
    </Sheet>
  );
}
