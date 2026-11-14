// Settings cards: sync status, the read-only DM link for ChatGPT, and saved copies.
import { useEffect, useState } from 'react';
import { feedUrl, getCloud, getReadKey, getSyncStatus, listCopies, onSyncStatus, rotateReadKey, syncNow, copiesDb, type SyncStatus } from '../data/cloud';
import { shareFile } from '../data/backup';
import { ConfirmBtn } from './kit';
import { fmtTime } from './state';

export function useSyncStatus(): SyncStatus {
  const [s, setS] = useState(getSyncStatus());
  useEffect(() => onSyncStatus(setS), []);
  return s;
}

const LABEL: Record<SyncStatus['state'], string> = {
  off: 'Not syncing',
  idle: 'Synced',
  syncing: 'Syncing…',
  offline: 'Offline',
  error: 'Sync problem',
  'signed-out': 'Signed out',
};

export function SyncSettings() {
  const s = useSyncStatus();
  const cloud = getCloud();
  const [key, setKey] = useState<string | null>(null);
  const [keyError, setKeyError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copies, setCopies] = useState<Awaited<ReturnType<typeof listCopies>>>([]);
  const refreshCopies = () => void listCopies().then(setCopies);
  useEffect(refreshCopies, []);
  useEffect(() => {
    if (cloud.token) getReadKey().then(setKey, (e) => setKeyError((e as Error).message));
  }, [cloud.token]);

  if (!cloud.configured && s.state === 'off') {
    return (
      <div className="card">
        <div className="label">Sync</div>
        <p className="small muted">Off on this copy of the app. Sync works on the deployed site (Cloudflare): set the DM passphrase there and every device that opens the site shares one campaign. This local preview keeps its data on this device only.</p>
      </div>
    );
  }
  const url = key ? feedUrl(key) : '';
  return (
    <>
      <div className="card">
        <div className="label">Sync</div>
        <p className="small"><strong>{LABEL[s.state]}</strong>{s.lastSyncAt ? ` · last ${fmtTime(s.lastSyncAt)}` : ''}{s.rev ? ` · version ${s.rev}` : ''}</p>
        {s.message && <p className="small muted">{s.message}</p>}
        <p className="small muted">Every device that opens this site uses the same campaign and the same passphrase. Changes upload a few seconds after you make them and download when the app opens or comes back to the front. If two devices change things offline at the same time, the newer upload wins and the other device's version is kept below as a saved copy.</p>
        <button className="btn block" disabled={s.state === 'syncing' || !cloud.token} onClick={() => void syncNow('manual')}>Sync now</button>
      </div>
      <div className="card">
        <div className="label">Read-only link for ChatGPT</div>
        <p className="small muted">Paste this link into a ChatGPT chat and ask it to open the link. It shows the full DM view (all spoilers, your notes and characters) as plain text pages, as of the last sync. It cannot change anything. Anyone with the link can read it: make a new link to switch the old one off.</p>
        {keyError && <p className="small" style={{ color: 'var(--bad)' }}>{keyError}</p>}
        {!cloud.token && <p className="small muted">Unlock the app while online to see the link.</p>}
        {url && <>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '.85rem', wordBreak: 'break-all', margin: '8px 0' }}>{url}</p>
          <div className="row wrap">
            <button className="btn sm primary" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setCopied(false); } }}>{copied ? 'Copied' : 'Copy link'}</button>
            <a className="btn sm" href={url} target="_blank" rel="noreferrer">Open</a>
            <ConfirmBtn className="btn sm danger" confirm="Switch off the current link?" onConfirm={async () => { setKey(await rotateReadKey()); setCopied(false); }}>Make a new link</ConfirmBtn>
          </div>
        </>}
      </div>
      {copies.length > 0 && (
        <div className="card">
          <div className="label">Saved copies</div>
          <p className="small muted">Versions of this device's data that were replaced by a newer sync. Save one as a file and restore it from Backup &amp; restore if you need it.</p>
          {copies.map((c) => (
            <div key={c.id} className="row between" style={{ marginTop: 8 }}>
              <div className="grow small">{fmtTime(c.savedAt)}<div className="muted">{c.reason}</div></div>
              <button className="btn sm" onClick={() => void shareFile(`solmourn-saved-copy-${c.savedAt.slice(0, 16).replace(/[:T]/g, '-')}.json`, c.json, 'application/json')}>Save file</button>
              <ConfirmBtn className="btn sm ghost" confirm="Delete this copy?" onConfirm={async () => { await copiesDb.copies.delete(c.id!); refreshCopies(); }}>Delete</ConfirmBtn>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
