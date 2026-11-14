// Player-safe exports, session recap, backup / restore / starter-pack import, first launch.
import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, requestPersistence } from '../data/db';
import { applyImport, exportBackup, parseBackup, previewImport, shareFile, wipeAll, type ImportPreview, type Resolution } from '../data/backup';
import { ensureSeed } from '../data/ensureSeed';
import { notify, nowIso, update } from '../data/repo';
import { buildCharacterSheet, buildKnownNpcs, buildKnownPlaces, buildPlayerRecap, scanSpoilers, type CampaignData } from '../domain/safe';
import { type BackupFile, type Branch, type Lesson, type StatCard, type Clock, type Clue, type PC, type Scene, type Session, type SessionEvent, type TimelineEntry } from '../domain/types';
import { ConfirmBtn, Empty, Md, Seg, Sheet, pretty } from './kit';
import { EVENT_KINDS } from './sheets';
import { fmtTime, getLocal, setLocal, useNav, useRow, useRows } from './state';
import { PassGate } from './Lock';

export type FullData = CampaignData & { scenes: Scene[]; timeline: TimelineEntry[]; lessons: Lesson[]; branches: Branch[]; statCards: StatCard[] };
export async function loadCampaignData(): Promise<FullData> {
  const [sessions, npcs, locations, lore, clues, revelations, events, docs, pcs, scenes, timeline, lessons, branches, statCards] = await Promise.all([
    // order matters: destructured positionally
    db.sessions.toArray(), db.npcs.toArray(), db.locations.toArray(), db.lore.toArray(), db.clues.toArray(), db.revelations.toArray(),
    db.events.toArray(), db.docs.toArray(), db.pcs.toArray(), db.scenes.toArray(), db.timeline.toArray(), db.lessons.toArray(), db.branches.toArray(), db.statCards.toArray(),
  ]);
  return { sessions, npcs, locations, lore, clues, revelations, events, docs, pcs, scenes, timeline, lessons, branches, statCards };
}
export const useCampaignData = () => useLiveQuery(loadCampaignData, []);

// ---------------- Export preview (always shown before anything leaves the app) ----------------
function ExportPreview({ filename, text, data }: { filename: string; text: string; data: CampaignData }) {
  const hits = scanSpoilers(text, data.revelations);
  const share = async () => {
    const r = await shareFile(filename, text, 'text/markdown');
    if (r !== 'cancelled') notify(r === 'shared' ? 'Shared' : `Saved ${filename}`);
  };
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    notify('Copied to clipboard');
  };
  return (
    <>
      {hits.length > 0 ? (
        <div className="banner bad">
          <strong>⚠ Possible spoilers.</strong> This text mentions things the party has not been shown yet:
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{hits.map((h, i) => <li key={i}><strong>{h.term}</strong> — “{h.line}”</li>)}</ul>
          Fix the player-safe wording, or mark the revelation as revealed if the table really knows it.
        </div>
      ) : (
        <div className="banner ok">✓ Built only from player-safe fields. No unrevealed spoiler words found.</div>
      )}
      <div className="card"><div className="label">Preview — exactly what players will get</div><Md text={text} /></div>
      <div className="grid2">
        {hits.length ? <ConfirmBtn className="btn" confirm="Share despite warnings?" onConfirm={share}>Share…</ConfirmBtn> : <button className="btn primary" onClick={share}>Share…</button>}
        {hits.length ? <ConfirmBtn className="btn" confirm="Copy despite warnings?" onConfirm={copy}>Copy text</ConfirmBtn> : <button className="btn" onClick={copy}>Copy text</button>}
      </div>
    </>
  );
}

// ---------------- Session recap ----------------
export function RecapSheet({ id }: { id: string }) {
  const s = useRow<Session>('sessions', id);
  const data = useCampaignData();
  const clocks = useRows<Clock>('clocks');
  const [tab, setTab] = useState<'dm' | 'player'>('dm');
  if (!s || !data) return <Sheet title="Recap">…</Sheet>;
  const events = data.events.filter((e) => e.sessionId === id && !e.deletedAt);
  const found = data.clues.filter((c: Clue) => c.discoveredSessionId === id);
  const from = s.startedAt ?? '0';
  const dmSummary = [
    `## Session ${s.index} — ${s.title}`,
    ...EVENT_KINDS.map((k) => {
      const rows = events.filter((e: SessionEvent) => e.kind === k.value);
      return rows.length ? `### ${k.label}\n${rows.map((e) => `- ${e.resolved ? '(resolved) ' : ''}${e.textMd}`).join('\n')}` : '';
    }),
    found.length ? `### Clues found\n${found.map((c) => `- ${c.title} (${pretty(c.status)})`).join('\n')}` : '',
    `### Clocks\n${clocks.map((c) => {
      const changes = c.reasonHistory.filter((h) => h.at >= from);
      return `- ${c.name}: ${c.value}/${c.max}${changes.map((h) => `\n  - ${h.from} → ${h.to}: ${h.reason || 'no reason written yet'}`).join('')}`;
    }).join('\n')}`,
  ].filter(Boolean).join('\n\n');
  return (
    <Sheet title={`Recap · Session ${s.index}`}>
      <Seg label="Recap view" value={tab} onChange={setTab} options={[{ value: 'dm', label: '🔒 DM summary' }, { value: 'player', label: '✓ Player recap' }]} />
      <div style={{ height: 10 }} />
      {tab === 'dm' ? (
        <>
          <div className="banner private">A draft assembled from your own notes, clue marks and clock changes. Nothing is inferred or invented - review it before treating it as the record.</div>
          <div className="card"><Md text={dmSummary} /></div>
          <ConfirmBtn className="btn block" confirm="Append to my session notes?" onConfirm={() => update<Session>('sessions', s.id, { dmNotesMd: `${s.dmNotesMd}\n\n${dmSummary}`.trim() }, { summary: 'Summary added to session notes', undoable: true })}>Append to my session notes</ConfirmBtn>
        </>
      ) : (
        <>
          <p className="small muted" style={{ marginBottom: 8 }}>Includes: your player recap text, notes marked “OK for player recap”, revealed clues and discoveries. Everything else is left out by default.</p>
          <ExportPreview filename={`solmourn-session-${s.index}-recap.md`} text={buildPlayerRecap(data, id)} data={data} />
        </>
      )}
    </Sheet>
  );
}

// ---------------- Player share hub ----------------
export function ShareSheet() {
  const data = useCampaignData();
  const [what, setWhat] = useState<string>('npcs');
  if (!data) return <Sheet title="Share with players">…</Sheet>;
  const sessions = data.sessions.filter((s) => !s.deletedAt).sort((a, b) => a.index - b.index);
  const pcs = data.pcs.filter((p: PC) => !p.deletedAt);
  let text = '';
  let filename = 'solmourn.md';
  if (what === 'npcs') { text = buildKnownNpcs(data); filename = 'solmourn-people.md'; }
  else if (what === 'places') { text = buildKnownPlaces(data); filename = 'solmourn-places.md'; }
  else if (what.startsWith('ses:')) { text = buildPlayerRecap(data, what.slice(4)); filename = `solmourn-recap-${what.slice(4)}.md`; }
  else if (what.startsWith('pc:')) { const pc = pcs.find((p) => p.id === what.slice(3)); text = pc ? buildCharacterSheet(pc) : ''; filename = `${pc?.name ?? 'character'}.md`; }
  const hiddenMet = data.npcs.filter((n) => !n.deletedAt && n.status !== 'UNMET' && n.visibility === 'DM_ONLY').length;
  return (
    <Sheet title="Share with players">
      <label className="field"><span>What to share</span>
        <select className="input" value={what} onChange={(e) => setWhat(e.target.value)}>
          <option value="npcs">People we know</option>
          <option value="places">Places we know</option>
          {sessions.map((s) => <option key={s.id} value={`ses:${s.id}`}>Session {s.index} recap</option>)}
          {pcs.map((p) => <option key={p.id} value={`pc:${p.id}`}>Character sheet: {p.name}</option>)}
        </select>
      </label>
      {what === 'npcs' && hiddenMet > 0 && <div className="banner warn">{hiddenMet} NPC{hiddenMet > 1 ? 's' : ''} the party has met {hiddenMet > 1 ? 'are' : 'is'} still DM-only and left out. Open the NPC and set “Player-safe” to include {hiddenMet > 1 ? 'them' : 'it'}.</div>}
      <ExportPreview filename={filename} text={text} data={data} />
    </Sheet>
  );
}

// ---------------- Import (starter pack or backup) ----------------
export function ImportFlow({ onDone }: { onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<BackupFile | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState('');
  const [choices, setChoices] = useState<Record<string, Resolution>>({});
  const [busy, setBusy] = useState(false);

  const load = async (data: BackupFile) => { setFile(data); setPreview(await previewImport(data)); setError(''); };
  const pick = async (f: File | undefined) => {
    if (!f) return;
    try { await load(parseBackup(await f.text())); } catch (e) { setError((e as Error).message); setFile(null); setPreview(null); }
  };
  const apply = async (mode: 'merge' | 'replace') => {
    if (!file) return;
    setBusy(true);
    await applyImport(file, { mode, resolutions: choices, fallback: 'mine' });
    await ensureSeed(); // an older backup is brought up to the current canon seed, edits preserved
    await requestPersistence();
    setBusy(false);
    notify('Import complete');
    onDone();
  };
  const C = preview?.counts ?? {};
  return (
    <div className="stack">
      {!preview && <>
        <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => pick(e.target.files?.[0])} />
        <button className="btn primary block" onClick={() => input.current?.click()}>Choose a backup file…</button>
      </>}
      {error && <div className="banner bad">{error}</div>}
      {preview && file && <>
        <div className="card">
          <div className="label">Import preview · {preview.kind === 'starter-pack' ? 'Legacy starter pack' : `Backup from ${fmtTime(preview.exportedAt)}`}</div>
          <div className="grid2 small">
            <span>{C.sessions ?? 0} sessions</span><span>{C.scenes ?? 0} scenes</span><span>{C.npcs ?? 0} NPCs</span><span>{C.locations ?? 0} places</span>
            <span>{C.lore ?? 0} lore entries</span><span>{C.clues ?? 0} clues</span><span>{C.revelations ?? 0} revelations</span><span>{C.canonDecisions ?? 0} canon decisions</span>
            <span>{C.pcs ?? 0} characters</span><span>{C.events ?? 0} notes</span><span>{C.docs ?? 0} documents</span><span>{C.clocks ?? 0} clocks</span>
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>Every record keeps its source file and heading, visibility and canon status. Nothing is written until you confirm.</p>
        </div>
        {preview.hasExistingData && (
          <div className="card">
            <div className="label">Compared with what is on this device</div>
            <p className="small">{preview.added} new · {preview.identical} unchanged · {preview.updated} updates to records you never edited · <strong>{preview.conflicts.length} conflict{preview.conflicts.length === 1 ? '' : 's'}</strong> with your own edits</p>
          </div>
        )}
        {preview.conflicts.map((c) => {
          const key = `${c.table}:${c.key}`;
          return (
            <div className="card" key={key}>
              <strong>{c.label}</strong> <span className="small muted">· {c.table} · you edited this ({c.mineRevision - 1}×)</span>
              <div style={{ height: 8 }} />
              <Seg label={`Resolve ${c.label}`} value={choices[key] ?? 'mine'} onChange={(v) => setChoices({ ...choices, [key]: v })}
                options={[{ value: 'mine', label: 'Keep mine' }, { value: 'incoming', label: 'Use incoming' }, { value: 'draft', label: 'Add as draft' }]} />
            </div>
          );
        })}
        <button className="btn primary block" disabled={busy} onClick={() => apply('merge')}>{preview.hasExistingData ? 'Merge into my campaign' : 'Import'}</button>
        {preview.hasExistingData && <ConfirmBtn className="btn danger block" confirm="Erase this device's data and restore?" onConfirm={() => apply('replace')}>Replace everything with this file</ConfirmBtn>}
        <button className="btn ghost block" onClick={() => { setFile(null); setPreview(null); }}>Cancel</button>
      </>}
    </div>
  );
}

// ---------------- Backup & restore ----------------
export function BackupSheet() {
  const nav = useNav();
  const [last, setLast] = useState(getLocal().lastBackupAt);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => { navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null)); }, []);
  const backup = async () => {
    const data = await exportBackup();
    const stamp = nowIso().slice(0, 16).replace(/[:T]/g, '-');
    const r = await shareFile(`solmourn-DM-ONLY-backup-${stamp}.json`, JSON.stringify(data), 'application/json');
    if (r === 'cancelled') return;
    setLocal({ lastBackupAt: nowIso() });
    setLast(nowIso());
    notify(r === 'shared' ? 'Backup handed to the share sheet' : 'Backup downloaded');
  };
  return (
    <Sheet title="Backup & restore">
      <PassGate what="export, restore or reset the campaign">
      <div className="card">
        <div className="label">Back up everything <span className="chip private">🔒 DM-only file</span></div>
        <p className="small muted">One file with the whole campaign: every record, note, character, document and the change history. On iPhone choose <strong>Save to Files</strong> (iCloud Drive keeps a copy off the phone).</p>
        <button className="btn primary block" style={{ marginTop: 10 }} onClick={backup}>Export full backup</button>
        <p className="small muted" style={{ marginTop: 8 }}>Last backup: {last ? fmtTime(last) : 'never'}</p>
        <div className="banner private" style={{ marginTop: 8 }}>The backup contains all DM secrets. Never send it to a player.</div>
      </div>
      <div className="card">
        <div className="label">Restore or import</div>
        <p className="small muted" style={{ marginBottom: 10 }}>Restore a backup made by this app. Older backups are upgraded to the current canon seed after restoring; your own edits are never overwritten silently.</p>
        <ImportFlow onDone={nav.close} />
      </div>
      <div className="card">
        <div className="label">Storage on this device</div>
        <p className="small">{persisted === true ? '✓ The browser has promised not to clear this data automatically.' : persisted === false ? 'The browser may clear this data under storage pressure. Add the app to your Home Screen and export backups regularly.' : 'Storage status unknown.'}</p>
        <button className="btn sm" style={{ marginTop: 8 }} onClick={async () => setPersisted(await requestPersistence())}>Ask for durable storage</button>
      </div>
      <ConfirmBtn className="btn danger block" confirm="Erase ALL campaign data on this device?" onConfirm={async () => { await wipeAll(); await ensureSeed(); nav.close(); }}>Reset to a fresh campaign (erases my data)</ConfirmBtn>
      </PassGate>
    </Sheet>
  );
}

export { Empty };
