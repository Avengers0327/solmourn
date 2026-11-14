// Resonance Pattern directory: list and compact index, search, filters, favorites, a selected
// character's known and prepared Patterns, detail cards, and a source-coverage report.
import { useMemo, useState } from 'react';
import type { PC, Pattern } from '../domain/types';
import { AMP_ENHANCEMENTS, DISCIPLINES, disciplineName } from '../content/rules';
import {
  SPELLS, SPELL_BOOKS, SPELL_INDEX_META, SRD_ATTRIBUTION, VERIFICATION_LABEL, bookSummaries, bookTitle, coverageReport, expressionFor, patternById, playerVisible, spellTotals,
} from '../content/spells';
import { canAddToBook } from '../domain/rules';
import { filterSpells } from '../domain/spellFilter';
import { isKnown, isPrepared, toggleBook, togglePrep } from '../data/patternActions';
import { setMeta } from '../data/repo';
import { Chip, Empty, Md, Seg } from './kit';
import { useMeta } from './state';

const FAV_KEY = 'favoritePatterns';
export const useFavorites = () => {
  const favs = useMeta<string[]>(FAV_KEY) ?? [];
  const toggle = (id: string) => setMeta(FAV_KEY, favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id]);
  return { favs, toggle };
};

const verTone = (p: Pattern) => (p.verification === 'SRD_VERIFIED' || p.verification === 'ORIGINAL' ? 'amber' : p.verification === 'UNOFFICIAL' ? 'bad' : '');

export function PatternCard({ p, onClose, pc }: { p: Pattern; onClose?: () => void; pc?: PC }) {
  const { favs, toggle } = useFavorites();
  const fav = favs.includes(p.id);
  const legal = pc && p.status === 'MAPPED' ? canAddToBook(pc, p) : null;
  return (
    <div className="card" style={{ borderColor: 'var(--amber)' }}>
      <div className="row between">
        <h3>{p.name}</h3>
        <div className="row">
          <button className="btn sm ghost" aria-pressed={fav} aria-label={fav ? `Remove ${p.name} from favorites` : `Add ${p.name} to favorites`} onClick={() => toggle(p.id)}>{fav ? '★' : '☆'}</button>
          {onClose && <button className="btn sm" onClick={onClose} aria-label="Close card">✕</button>}
        </div>
      </div>
      {p.publishedName && <p className="small muted">Published as: {p.publishedName}</p>}
      <div className="row wrap" style={{ margin: '6px 0' }}>
        <Chip tone="amber">{p.rpCost} RP</Chip><Chip>{disciplineName(p.discipline)}</Chip><Chip>{p.level === 0 ? 'Cantrip' : `Level ${p.level}`}</Chip>{p.school && <Chip>{p.school}</Chip>}
        {p.status === 'EXCLUDED' ? <Chip tone="bad">Not available</Chip> : <Chip>PLAYTEST mapping</Chip>}
        {p.verification && <Chip tone={verTone(p)}>{VERIFICATION_LABEL[p.verification]}</Chip>}
        {p.ambiguous && <Chip>Mapping is a judgement call</Chip>}
      </div>
      {p.status === 'EXCLUDED' && <div className="banner bad">{p.origin === 'UA' ? 'Excluded' : 'No Resonance equivalent (WORKING ruling)'}: {p.excludedReason}</div>}
      {p.discrepancies?.length ? <div className="banner warn"><strong>Sources disagree:</strong> {p.discrepancies.join('; ')}. Check the book.</div> : null}
      <div className="md tbl" style={{ marginBottom: 8 }}>
        <div className="tbl-row"><b className="k">Casting time</b>{p.action}</div>
        <div className="tbl-row"><b className="k">Range</b>{p.range}</div>
        <div className="tbl-row"><b className="k">Duration</b>{p.duration ?? '—'}{p.concentration ? ' · concentration' : ''}{p.ritual ? ' · ritual' : ''}</div>
        <div className="tbl-row"><b className="k">Components</b>{p.components || '—'} <span className="muted">(a Resonant's Anchor replaces an arcane focus)</span></div>
        <div className="tbl-row"><b className="k">Books</b>{(p.sources ?? []).map(bookTitle).join('; ') || '—'}</div>
        <div className="tbl-row"><b className="k">In-world</b>{expressionFor(p.discipline)}</div>
        <div className="tbl-row"><b className="k">Why {disciplineName(p.discipline)}</b>{p.mappingNote}</div>
        <div className="tbl-row"><b className="k">Access</b>Resonant attuned to {disciplineName(p.discipline)}, caster level {Math.max(1, p.level * 2 - 1)}+{p.level >= 6 ? ' · once per long rest at this level' : ''}; DM approval for the Patternbook. Cast with {p.rpCost} RP{p.concentration ? ', concentration' : ''}; overcasting adds a bounded enhancement (Amplification) or borrows up to 2 RP (Emergency), never both.</div>
      </div>
      {pc && p.status === 'MAPPED' && (
        <div className="card" style={{ background: 'var(--bg-2)' }}>
          <div className="label">{pc.name}</div>
          {legal && !legal.ok && <p className="small" style={{ color: 'var(--warn)' }}>{legal.error}</p>}
          <div className="grid2">
            <button className={`btn sm ${isKnown(pc, p) ? 'primary' : ''}`} onClick={() => toggleBook(pc, p)}>{isKnown(pc, p) ? '✓ In book' : 'Add to book'}</button>
            <button className={`btn sm ${isPrepared(pc, p) ? 'primary' : ''}`} disabled={!isKnown(pc, p) || p.level === 0} onClick={() => togglePrep(pc, p)}>{p.level === 0 ? 'Always ready' : isPrepared(pc, p) ? '✓ Prepared' : 'Prepare'}</button>
          </div>
        </div>
      )}
      {p.rulesMd ? <Md text={p.rulesMd} /> : <p className="small muted">The rules text for this entry is not included here{p.origin === 'UA' ? ' (it is not a published spell)' : ''}. Save, attack, effect and upcasting: see the book listed above.</p>}
      {p.upcastMd && <><div className="label" style={{ marginTop: 10 }}>At higher levels</div><Md text={p.upcastMd} /></>}
      {p.status !== 'EXCLUDED' && (
        <details style={{ marginTop: 10 }}>
          <summary className="small">Amplification options (one only, twice per long rest)</summary>
          <ul className="small" style={{ paddingLeft: 18 }}>{AMP_ENHANCEMENTS.map((e) => <li key={e.id}><strong>{e.label}:</strong> {e.text(1)}</li>)}</ul>
        </details>
      )}
      <p className="small muted" style={{ marginTop: 8 }}>{p.source}</p>
    </div>
  );
}

type Avail = 'ALL' | 'MAPPED' | 'EXCLUDED';
export function SpellDirectory({ pcs = [], playerView = false }: { pcs?: PC[]; playerView?: boolean }) {
  const [view, setView] = useState<'list' | 'index' | 'coverage'>('list');
  const [q, setQ] = useState('');
  const [disc, setDisc] = useState('ALL');
  const [level, setLevel] = useState('ALL');
  const [school, setSchool] = useState('ALL');
  const [book, setBook] = useState('ALL');
  const [ver, setVer] = useState('ALL');
  const [avail, setAvail] = useState<Avail>('ALL');
  const [pcId, setPcId] = useState('');
  const [mine, setMine] = useState<'ALL' | 'LEGAL' | 'KNOWN' | 'PREPARED'>('ALL');
  const [favOnly, setFavOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const { favs } = useFavorites();
  const resonants = pcs.filter((p) => p.classId === 'resonant');
  const pc = resonants.find((p) => p.id === pcId);
  const pool = useMemo(() => (playerView ? playerVisible(SPELLS) : SPELLS), [playerView]);
  const list = useMemo(() => filterSpells(SPELLS, { q, discipline: disc, level, school, book, verification: ver, availability: avail, favoritesOnly: favOnly, favorites: favs, character: pc, mine, playerView }),
    [q, disc, level, school, book, ver, avail, favOnly, favs, pc, mine, playerView]);
  const sel = (label: string, value: string, set: (v: string) => void, opts: [string, string][]) => (
    <label className="field" style={{ marginBottom: 0 }}><span>{label}</span>
      <select className="input" value={value} onChange={(e) => set(e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
  );
  const totals = spellTotals();
  const openCard = open ? patternById(open) : undefined;
  return (
    <div>
      <Seg label="Directory view" value={view} onChange={setView} options={[{ value: 'list', label: 'List' }, { value: 'index', label: 'Compact index' }, { value: 'coverage', label: 'Sources & coverage' }]} />
      <div style={{ height: 10 }} />
      {view !== 'coverage' && <>
        <input className="input" placeholder="Search by Pattern name or published spell name" aria-label="Search Patterns" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid2" style={{ margin: '10px 0' }}>
          {sel('Discipline', disc, setDisc, [['ALL', 'All'], ...DISCIPLINES.map((d): [string, string] => [d.id, d.name])])}
          {sel('Level', level, setLevel, [['ALL', 'All'], ...Array.from({ length: 10 }, (_, l): [string, string] => [String(l), l === 0 ? 'Cantrip' : `Level ${l}`])])}
          {sel('School', school, setSchool, [['ALL', 'All'], ...['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'].map((s): [string, string] => [s, s])])}
          {sel('Sourcebook', book, setBook, [['ALL', 'All'], ...SPELL_BOOKS.filter((b) => !(playerView && b.code === 'UA')).map((b): [string, string] => [b.code, `${b.code}: ${b.title}`])])}
          {sel('Verification', ver, setVer, [['ALL', 'All'], ['SRD_VERIFIED', 'SRD verified'], ['CROSS_CHECKED', 'Unverified (one index)'], ['ORIGINAL', 'Original'], ...(playerView ? [] : [['UNOFFICIAL', 'Unofficial playtest'] as [string, string]])])}
          {sel('Availability', avail, (v) => setAvail(v as Avail), [['ALL', 'All'], ['MAPPED', 'Available as Patterns'], ['EXCLUDED', 'Not available']])}
        </div>
        <div className="grid2" style={{ marginBottom: 6 }}>
          {sel('Character', pcId, (v) => { setPcId(v); if (!v) setMine('ALL'); }, [['', 'None'], ...resonants.map((p): [string, string] => [p.id, `${p.name} (${p.attunement === 'UNATTUNED' ? 'unattuned' : disciplineName(p.attunement)})`])])}
          {sel('For the character', mine, (v) => setMine(v as typeof mine), [['ALL', 'Everything'], ['LEGAL', 'Legal to add'], ['KNOWN', 'In the book'], ['PREPARED', 'Prepared']])}
        </div>
        <label className="row" style={{ minHeight: 44 }}><input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} /><span>Favorites only ({favs.length})</span></label>
        {resonants.length === 0 && <p className="small muted">Create a Resonant to filter by what a character can learn.</p>}
        <p className="small muted" style={{ marginBottom: 8 }}>{list.length} of {pool.length} entries · {totals.srd} SRD-verified · {totals.unverified} unverified</p>
      </>}
      {view === 'list' && (openCard && open ? <PatternCard p={openCard} pc={pc} onClose={() => setOpen(null)} /> : list.slice(0, 120).map((p) => (
        <button key={p.id} className="list-item" onClick={() => setOpen(p.id)}>
          <div className="grow"><div className="t">{favs.includes(p.id) ? '★ ' : ''}{p.name}{p.status === 'EXCLUDED' ? ' ✕' : ''}{pc && isKnown(pc, p) ? ' ✓' : ''}</div>
            <div className="s">{disciplineName(p.discipline)} · {p.level === 0 ? 'cantrip' : `level ${p.level}`} · {p.school} · {(p.sources ?? []).join('/')}{p.concentration ? ' · conc.' : ''}{p.publishedName ? ` · was ${p.publishedName}` : ''}</div></div>
          <Chip tone={p.status === 'EXCLUDED' ? 'bad' : 'amber'}>{p.status === 'EXCLUDED' ? 'n/a' : `${p.rpCost} RP`}</Chip>
        </button>
      )))}
      {view === 'list' && !open && list.length > 120 && <p className="small muted center">Showing the first 120. Narrow the filters to see the rest.</p>}
      {view === 'index' && (openCard && open ? <PatternCard p={openCard} pc={pc} onClose={() => setOpen(null)} /> : (
        <div className="row wrap">
          {list.map((p) => <button key={p.id} className="btn sm ghost" style={p.status === 'EXCLUDED' ? { opacity: 0.5, textDecoration: 'line-through' } : undefined} onClick={() => setOpen(p.id)}>{favs.includes(p.id) ? '★ ' : ''}{p.name} <span className="muted">{p.level}</span></button>)}
        </div>
      ))}
      {view !== 'coverage' && !list.length && <Empty>No Patterns match.</Empty>}
      {view === 'coverage' && <Coverage playerView={playerView} />}
    </div>
  );
}

function Coverage({ playerView }: { playerView: boolean }) {
  const t = spellTotals();
  const books = bookSummaries().filter((b) => !(playerView && b.code === 'UA'));
  const cov = coverageReport();
  const conflicts = SPELLS.filter((s) => s.discrepancies?.length);
  const ambiguous = SPELLS.filter((s) => s.ambiguous);
  return (
    <>
      <div className="banner warn">
        <strong>What is and is not verified.</strong> {t.srd} spells are SRD-verified (official SRD text, cross-checked against a second index). The other {t.unverified} official spells have <strong>unverified</strong> metadata from one third-party index, {SPELL_INDEX_META.indexSource}, and no rules text; none has been checked against an official book. Page numbers are not recorded. Other books (Mordenkainen's Tome of Foes, Volo's, Van Richten's and the adventure books) print no new player spells and are not listed.
      </div>
      <div className="card small">
        <div className="label">Totals</div>
        <div>{t.rows} rows: {t.official} official ({t.srd} SRD-verified, {t.unverified} unverified), {t.original} original Patterns{playerView ? '' : `, ${t.unofficial} Unearthed Arcana (excluded)`}.</div>
        <div>{t.mapped} available as Patterns, {t.excluded} excluded with reasons, {t.ambiguous} mappings flagged as judgement calls.</div>
        <div className="muted">A spell printed in several books is one row, counted under each book below.</div>
      </div>
      <div className="section-title"><span>By sourcebook</span></div>
      {books.map((b) => (
        <div className="card" key={b.code}>
          <div className="row between"><strong>{b.code}</strong><Chip>{b.scope}</Chip></div>
          <p className="small">{b.title}</p>
          <p className="small muted">{b.total} spells · {b.verified} verified · {b.unverified} unverified · {b.mapped} available · {b.excluded} excluded</p>
          <details><summary className="small">By level</summary>
            {cov.filter((c) => c.code === b.code).map((c) => <div key={c.level} className="row between small" style={{ minHeight: 26 }}><span>{c.level === 0 ? 'Cantrips' : `Level ${c.level}`}</span><span>{c.total} · {c.mapped} avail · {c.excluded} excl · {c.unverified} unverified</span></div>)}
          </details>
        </div>
      ))}
      {conflicts.length > 0 && <>
        <div className="section-title"><span>Where sources disagree ({conflicts.length})</span></div>
        {conflicts.map((s) => <div className="card small" key={s.id}><strong>{s.name}</strong>: {s.discrepancies!.join('; ')}. Both values recorded; check your book.</div>)}
      </>}
      <div className="section-title"><span>Mappings that are judgement calls ({ambiguous.length})</span></div>
      {ambiguous.map((s) => <div className="card small" key={s.id}><strong>{s.name}</strong> → {disciplineName(s.discipline)}. {s.mappingNote}</div>)}
      <p className="small muted">{SRD_ATTRIBUTION}</p>
    </>
  );
}
