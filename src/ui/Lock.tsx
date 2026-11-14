// DM passphrase screens: unlock, recovery, set/change/remove, and re-entry for protected actions.
import { useState, type ReactNode } from 'react';
import { createLock, loadLock, saveLock, validatePassphrase, verifyLegacyPin, verifyPassphrase, verifyRecovery, MIN_LENGTH } from '../domain/passphrase';
import { wipeAll } from '../data/backup';
import { ConfirmBtn } from './kit';
import { getLocal, setLocal } from './state';

/** True when the DM view is protected (passphrase set, or a legacy passcode awaiting upgrade). */
export const lockConfigured = () => !!loadLock() || !!getLocal().pinHash;

/** Checks a passphrase (or a legacy passcode, which it does not accept forever: see LegacyUpgrade). */
export async function checkPassphrase(p: string): Promise<boolean> {
  const rec = loadLock();
  if (rec) return verifyPassphrase(rec, p);
  const legacy = getLocal().pinHash;
  return legacy ? verifyLegacyPin(legacy, p) : true;
}

function PassInput({ value, onChange, label, autoFocus, onEnter }: { value: string; onChange: (v: string) => void; label: string; autoFocus?: boolean; onEnter?: () => void }) {
  return (
    <input className="input" style={{ maxWidth: 320 }} type="password" autoComplete="current-password" autoFocus={autoFocus} aria-label={label} placeholder={label}
      value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onEnter?.()} />
  );
}

export function RecoveryCodeNotice({ code, onDone }: { code: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card" style={{ borderColor: 'var(--amber)', textAlign: 'left' }}>
      <div className="label">Recovery code — shown once</div>
      <p className="small">If you forget the passphrase, this code lets you set a new one. Write it down or save it in your password manager. It is not stored anywhere readable.</p>
      <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '1.15rem', letterSpacing: '.06em', margin: '10px 0', wordBreak: 'break-all' }}>{code}</p>
      <div className="row">
        <button className="btn sm" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); } catch { setCopied(false); } }}>{copied ? 'Copied' : 'Copy'}</button>
        <button className="btn sm primary" onClick={onDone}>I have saved it</button>
      </div>
    </div>
  );
}

/** Set a new passphrase (first time, after recovery, or when changing). */
export function SetPassphrase({ onSet, submitLabel = 'Set passphrase' }: { onSet: () => void; submitLabel?: string }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  if (code) return <RecoveryCodeNotice code={code} onDone={onSet} />;
  const submit = async () => {
    const problem = validatePassphrase(a);
    if (problem) return setError(problem);
    if (a !== b) return setError('The two entries do not match.');
    setBusy(true);
    const { record, recoveryCode } = await createLock(a);
    saveLock(record);
    setLocal({ pinHash: undefined });
    setBusy(false);
    setA(''); setB('');
    setCode(recoveryCode);
  };
  return (
    <div className="stack">
      <PassInput label={`New passphrase (${MIN_LENGTH}+ characters)`} value={a} onChange={(v) => { setA(v); setError(''); }} />
      <PassInput label="Repeat it" value={b} onChange={(v) => { setB(v); setError(''); }} onEnter={submit} />
      {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
      <button className="btn primary" disabled={busy || !a || !b} onClick={submit}>{busy ? 'Working…' : submitLabel}</button>
    </div>
  );
}

/** Full-screen lock shown at launch (and after "Lock now" or a long time in the background). */
export function LockScreen({ onUnlock, onPresenter }: { onUnlock: () => void; onPresenter: () => void }) {
  const [p, setP] = useState('');
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'unlock' | 'recover' | 'newpass' | 'upgrade'>('unlock');
  const [code, setCode] = useState('');
  const legacy = !loadLock() && !!getLocal().pinHash;
  const submit = async () => {
    setBusy(true);
    const ok = await checkPassphrase(p);
    setBusy(false);
    if (!ok) { setBad(true); setP(''); return; }
    if (legacy) { setMode('upgrade'); return; } // the old 4-digit passcode must be replaced
    onUnlock();
  };
  const recover = async () => {
    const rec = loadLock();
    if (rec && (await verifyRecovery(rec, code))) { setMode('newpass'); setBad(false); }
    else setBad(true);
  };
  return (
    <div className="app"><div className="fullscreen">
      <h1 style={{ color: 'var(--amber)', letterSpacing: '.14em' }}>SOLMOURN</h1>
      {mode === 'unlock' && <>
        <p className="muted">{legacy ? 'Enter your old DM passcode' : 'DM passphrase'}</p>
        <PassInput label={legacy ? 'Passcode' : 'Passphrase'} value={p} autoFocus onChange={(v) => { setP(v); setBad(false); }} onEnter={submit} />
        {bad && <p style={{ color: 'var(--bad)' }}>That is not the passphrase.</p>}
        <button className="btn primary" disabled={busy || !p} onClick={submit}>{busy ? 'Checking…' : 'Unlock DM view'}</button>
        <button className="btn" onClick={onPresenter}>Open player view instead</button>
        <p className="small muted" style={{ maxWidth: 320 }}>The player view shows only player-safe content and needs no passphrase.</p>
        {!legacy && <button className="btn ghost sm" onClick={() => { setMode('recover'); setBad(false); }}>Forgot the passphrase?</button>}
      </>}
      {mode === 'recover' && <>
        <p className="muted">Enter the recovery code you saved when you set the passphrase.</p>
        <input className="input" style={{ maxWidth: 320, fontFamily: 'ui-monospace, monospace' }} autoCapitalize="characters" aria-label="Recovery code" placeholder="XXXX-XXXX-XXXX-XXXX" value={code} onChange={(e) => { setCode(e.target.value); setBad(false); }} />
        {bad && <p style={{ color: 'var(--bad)' }}>That recovery code does not match.</p>}
        <button className="btn primary" disabled={!code} onClick={recover}>Use recovery code</button>
        <button className="btn ghost sm" onClick={() => setMode('unlock')}>Back</button>
        <details style={{ marginTop: 16, maxWidth: 320 }}>
          <summary className="muted small">Lost the recovery code too?</summary>
          <p className="small muted" style={{ margin: '8px 0' }}>Erase this device's campaign data and passphrase, then restore your latest backup file from Library → Backup &amp; restore. Without a backup, notes and characters on this device are lost; the campaign itself is reloaded.</p>
          <ConfirmBtn className="btn danger sm" confirm="Erase everything on this device?" onConfirm={async () => { await wipeAll(); saveLock(null); setLocal({ pinHash: undefined, presenter: false }); location.reload(); }}>Erase and reset</ConfirmBtn>
        </details>
      </>}
      {mode === 'newpass' && <><p className="muted">Recovery code accepted. Choose a new passphrase.</p><SetPassphrase onSet={onUnlock} /></>}
      {mode === 'upgrade' && <><p className="muted" style={{ maxWidth: 320 }}>Passcodes are replaced by passphrases. Choose one now (the old passcode stops working).</p><SetPassphrase onSet={onUnlock} /></>}
    </div></div>
  );
}

/** Wrap a protected feature: asks for the passphrase again before showing its controls. */
export function PassGate({ children, what }: { children: ReactNode; what: string }) {
  const [ok, setOk] = useState(!lockConfigured());
  const [p, setP] = useState('');
  const [bad, setBad] = useState(false);
  if (ok) return <>{children}</>;
  const submit = async () => { if (await checkPassphrase(p)) { setOk(true); setP(''); } else { setBad(true); setP(''); } };
  return (
    <div className="card">
      <div className="label">🔒 Passphrase required</div>
      <p className="small muted" style={{ marginBottom: 8 }}>Enter the DM passphrase to {what}.</p>
      <div className="row"><div className="grow"><PassInput label="Passphrase" value={p} onChange={(v) => { setP(v); setBad(false); }} onEnter={submit} /></div><button className="btn primary" disabled={!p} onClick={submit}>Continue</button></div>
      {bad && <p className="small" style={{ color: 'var(--bad)', marginTop: 6 }}>That is not the passphrase.</p>}
    </div>
  );
}

/** Settings panel: set, change or remove the passphrase. */
export function PassphraseSettings() {
  const [, force] = useState(0);
  const [changing, setChanging] = useState(false);
  const configured = !!loadLock();
  if (!configured) {
    return (
      <div className="card">
        <div className="label">DM passphrase</div>
        <p className="small muted" style={{ marginBottom: 8 }}>Not set. Anyone holding this phone can open the DM view. Set one before the first session. It is asked when the app opens, when leaving Presenter mode, and before backups, restores, resets and passphrase changes. It is stored only as a salted hash on this device and is never in backups.</p>
        <SetPassphrase onSet={() => force((n) => n + 1)} />
      </div>
    );
  }
  return (
    <div className="card">
      <div className="label">DM passphrase</div>
      <p className="small muted" style={{ marginBottom: 8 }}>Set {new Date(loadLock()!.setAt).toLocaleDateString()}. Forgot it? Lock the app and use "Forgot the passphrase?" with your recovery code.</p>
      {!changing ? <button className="btn block" onClick={() => setChanging(true)}>Change passphrase or remove it…</button> : (
        <PassGate what="change or remove the passphrase">
          <SetPassphrase submitLabel="Save new passphrase" onSet={() => { setChanging(false); force((n) => n + 1); }} />
          <hr />
          <ConfirmBtn className="btn danger block" confirm="Leave the DM view unprotected?" onConfirm={() => { saveLock(null); setLocal({ pinHash: undefined }); setChanging(false); force((n) => n + 1); }}>Remove the passphrase</ConfirmBtn>
        </PassGate>
      )}
    </div>
  );
}
