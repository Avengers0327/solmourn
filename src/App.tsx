import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './data/db';
import { ensureSeed } from './data/ensureSeed';
import { getParams, installChangeTracking, onSyncStatus, syncNow } from './data/cloud';
import { setToastHandler } from './data/repo';
import { AcademySheet, BranchesSheet, LessonSheet, SeedReportSheet, StatCardsSheet, StateSheet } from './ui/Campaign';
import { CreationSheet } from './ui/Creation';
import { Library, SpeciesCatalogSheet, ChecksSheet, HistorySheet, SpellsSheet, RulesSheet, SearchSheet, SettingsSheet, StatusSheet } from './ui/Library';
import { Mysteries, TrialSheet } from './ui/Mysteries';
import { Now } from './ui/Now';
import { CastSheet, Party, PcEditSheet, PcSheet } from './ui/Party';
import { Presenter } from './ui/Presenter';
import { BackupSheet, RecapSheet, ShareSheet } from './ui/share';
import {
  ClockSheet, ClueList, ClueSheet, DecisionSheet, DecisionsSheet, DocSheet, EventSheet, LocationSheet, LoreSheet, NoteSheet, NotesSheet, NpcList,
  NpcSheet, QuickAddSheet, ReadAloudSheet, RevealClueSheet, RevelationSheet, SessionSheet, SessionsSheet, TimelineSheet,
} from './ui/sheets';
import { NavCtx, getLocal, setLocal, type Nav, type SheetSpec, type Tab } from './ui/state';
import { LockScreen, lockConfigured } from './ui/Lock';
import { DiceSheet, InitiativeSheet } from './ui/tools';
import { World } from './ui/World';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'now', label: 'Now', icon: '◉' }, { id: 'world', label: 'World', icon: '◍' }, { id: 'party', label: 'Party', icon: '◈' },
  { id: 'mysteries', label: 'Mysteries', icon: '◇' }, { id: 'library', label: 'Library', icon: '▤' },
];

function renderSheet(s: SheetSpec) {
  switch (s.type) {
    case 'npc': return <NpcSheet id={s.id} />;
    case 'clue': return <ClueSheet id={s.id} />;
    case 'revelation': return <RevelationSheet id={s.id} />;
    case 'lore': return <LoreSheet id={s.id} />;
    case 'location': return <LocationSheet id={s.id} />;
    case 'timeline': return <TimelineSheet id={s.id} />;
    case 'decision': return <DecisionSheet id={s.id} />;
    case 'pc': return <PcSheet id={s.id} />;
    case 'pcEdit': return <PcEditSheet id={s.id} />;
    case 'cast': return <CastSheet id={s.id} />;
    case 'clock': return <ClockSheet id={s.id} />;
    case 'session': return <SessionSheet id={s.id} />;
    case 'recap': return <RecapSheet id={s.id} />;
    case 'trial': return <TrialSheet id={s.id} />;
    case 'event': return <EventSheet id={s.id} />;
    case 'doc': return <DocSheet id={s.id} find={s.find} />;
    case 'readAloud': return <ReadAloudSheet id={s.id} />;
    case 'note': return <NoteSheet kind={s.kind} text={s.text} />;
    case 'dice': return <DiceSheet />;
    case 'initiative': return <InitiativeSheet />;
    case 'revealClue': return <RevealClueSheet />;
    case 'search': return <SearchSheet />;
    case 'share': return <ShareSheet />;
    case 'backup': return <BackupSheet />;
    case 'checks': return <ChecksSheet />;
    case 'rules': return <RulesSheet />;
    case 'patterns': case 'spells': return <SpellsSheet />;
    case 'academy': return <AcademySheet />;
    case 'lesson': return <LessonSheet id={s.id} />;
    case 'statCards': return <StatCardsSheet />;
    case 'branches': return <BranchesSheet />;
    case 'state': return <StateSheet />;
    case 'seedReport': return <SeedReportSheet />;
    case 'createPc': return <CreationSheet />;
    case 'speciesCatalog': return <SpeciesCatalogSheet />;
    case 'history': return <HistorySheet />;
    case 'settings': return <SettingsSheet />;
    case 'status': return <StatusSheet />;
    case 'npcList': return <NpcList />;
    case 'clueList': return <ClueList />;
    case 'quickAdd': return <QuickAddSheet />;
    case 'sessions': return <SessionsSheet />;
    case 'notes': return <NotesSheet />;
    case 'decisions': return <DecisionsSheet />;
    default: return null;
  }
}

export function App() {
  const [tab, setTab] = useState<Tab>('now');
  const [sheets, setSheets] = useState<SheetSpec[]>([]);
  const [presenter, setPresenter] = useState(!!getLocal().presenter);
  const [locked, setLocked] = useState(lockConfigured() && !getLocal().presenter);
  const [lockNotice, setLockNotice] = useState('');
  // A device that has never been unlocked asks the server whether a shared passphrase exists
  // before showing anything (at most a few seconds; offline it goes straight on).
  const [booted, setBooted] = useState(lockConfigured());
  useEffect(() => {
    installChangeTracking();
    void getParams(3000).then((p) => {
      if (p?.configured && !getLocal().presenter && !booted) setLocked(true);
      setBooted(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Another device changed the passphrase: ask for it again.
  useEffect(() => onSyncStatus((st) => {
    if (st.relock && lockConfigured() && !getLocal().presenter) { setLockNotice(st.message ?? ''); setSheets([]); setLocked(true); }
  }), []);

  // Re-lock the DM view after 5 minutes in the background (phone in a pocket, app switched).
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 5 * 60_000 && lockConfigured() && !getLocal().presenter) { setSheets([]); setLocked(true); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const [toast, setToast] = useState<{ message: string; undo?: () => Promise<void> } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hasCampaign = useLiveQuery(async () => (await db.campaigns.count()) > 0, []);
  const [seedState, setSeedState] = useState<string>('pending');

  // Preload / upgrade the app-owned campaign seed. Works offline: the seed ships with the app.
  const runSeed = useCallback(() => {
    setSeedState('pending');
    ensureSeed().then(() => setSeedState('ready')).catch((e) => setSeedState(String(e?.message ?? e)));
  }, []);
  useEffect(runSeed, [runSeed]);

  // Sync with the server once the campaign is ready, whenever the app returns to the front or the
  // device comes back online, and every minute while it is open.
  useEffect(() => {
    if (seedState !== 'ready' || locked) return;
    void syncNow('ready');
    const onVis = () => { if (!document.hidden) void syncNow('visible'); };
    const onOnline = () => void syncNow('online');
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', onOnline);
    const timer = setInterval(() => { if (!document.hidden) void syncNow('timer'); }, 60_000);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', onOnline); clearInterval(timer); };
  }, [seedState, locked]);

  useEffect(() => {
    setToastHandler((message, undo) => {
      clearTimeout(timer.current);
      setToast({ message, undo });
      timer.current = setTimeout(() => setToast(null), undo ? 6000 : 3500);
    });
  }, []);

  const enterPresenter = useCallback(() => { setLocal({ presenter: true }); setSheets([]); setPresenter(true); }, []);
  const nav: Nav = useMemo(() => ({
    open: (s) => setSheets((prev) => [...prev, s]),
    close: () => setSheets((prev) => prev.slice(0, -1)),
    setTab: (t) => { setSheets([]); setTab(t); },
    enterPresenter,
  }), [enterPresenter]);

  if (!booted) return <div className="app"><div className="fullscreen"><p className="muted">Opening…</p></div></div>;
  if (locked) return <LockScreen notice={lockNotice} onUnlock={() => { setLockNotice(''); setLocked(false); }} onPresenter={() => { setLocal({ presenter: true }); setPresenter(true); setLocked(false); }} />;
  if (seedState !== 'ready' && seedState !== 'pending') {
    return (
      <div className="app"><div className="fullscreen">
        <h2>The campaign could not be prepared</h2>
        <p className="muted">Nothing was changed: the update runs as a single step and was rolled back. Your existing data is intact.</p>
        <p className="small muted">{seedState}</p>
        <button className="btn primary" onClick={runSeed}>Try again</button>
      </div></div>
    );
  }
  if (seedState === 'pending' || !hasCampaign) return <div className="app"><div className="fullscreen"><p className="muted">Preparing the campaign…</p></div></div>;
  if (presenter) return <Presenter onExit={() => { setLocal({ presenter: false }); setPresenter(false); }} />;

  const top = sheets[sheets.length - 1];
  return (
    <NavCtx.Provider value={nav}>
      <div className="app">
        <header className="topbar">
          <div className="brand">SOLMOURN<small>{TABS.find((t) => t.id === tab)?.label} · 🔒 DM view</small></div>
          <button className="btn sm" onClick={() => nav.open({ type: 'search' })} aria-label="Search">🔍</button>
          <button className="btn sm" onClick={enterPresenter} aria-label="Presenter mode: hide DM content">📺</button>
          {lockConfigured() && <button className="btn sm" onClick={() => { setSheets([]); setLocked(true); }} aria-label="Lock the DM view">🔒</button>}
        </header>
        <main className="screen">
          {tab === 'now' && <Now />}
          {tab === 'world' && <World />}
          {tab === 'party' && <Party />}
          {tab === 'mysteries' && <Mysteries />}
          {tab === 'library' && <Library />}
        </main>
        {!top && <button className="fab" onClick={() => nav.open({ type: 'quickAdd' })} aria-label="Quick add">+</button>}
        <nav className="tabbar" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => nav.setTab(t.id)}>
              <span className="ico" aria-hidden>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
        {top && <div key={sheets.length + JSON.stringify(top)}>{renderSheet(top)}</div>}
        {toast && (
          <div className="toast" role="status" aria-live="polite">
            <span>{toast.message}</span>
            {toast.undo && <button className="btn sm primary" onClick={async () => { await toast.undo!(); setToast(null); }}>Undo</button>}
          </div>
        )}
      </div>
    </NavCtx.Provider>
  );
}
