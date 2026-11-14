// DM passphrase screens: unlock, recovery, set/change/remove, and re-entry for protected actions.
// On the deployed site the passphrase is shared by every device (see data/passFlow.ts).
import { useEffect, useState, type ReactNode } from 'react';
import { loadLock, saveLock, verifyRecovery, MIN_LENGTH } from '../domain/passphrase';
import { wipeAll } from '../data/backup';
import { cloudReset, getParams, type AuthParams } from '../data/cloud';
import { checkLocal, lockConfigured as lockConfiguredFlow, setPassphrase, sharedPassphrase, unlock } from '../data/passFlow';
import { ConfirmBtn } from './kit';
import { getLocal, setLocal } from './state';

/** True when the DM view is protected on this device. */
export const lockConfigured = lockConfiguredFlow;
/** Re-confirms the passphrase for protected actions (works offline). */
export const checkPassphrase = checkLocal;

function PassInput({ value, onChange, label, autoFocus, onEnter }: { value: string; onChange: (v: string) => void; label: string; autoFocus?: boolean; onEnter?: () => void }) {
  return (
    <input className="input" style={{ maxWidth: 320 }} type="password" autoComplete="current-password" autoFocus={autoFocus} aria-label={label} placeholder={label}
      value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onEnter?.()} />
  );
}

export function RecoveryCodeNotice({ code, onDone, shared }: { code: string; onDone: () => void; shared?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card" style={{ borderColor: 'var(--amber)', textAlign: 'left' }}>
      <div className="label">Recovery code — shown once</div>
      <p className="small">
        {shared ? 'Your passphrase now unlocks the DM view on every device that opens this site. ' : ''}
        If you forget the passphrase, this code lets you set a new one. Write it down or save it in your password manager. It is not stored anywhere readable.
      </p>
      <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '1.15rem', letterSpacing: '.06em', margin: '10px 0', wordBreak: 'break-all' }}>{code}</p>
      <div className="row">
        <button className="btn sm" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); } catch { setCopied(false); } }}>{copied ? 'Copied' : 'Copy'}</button>
        <button className="btn sm primary" onClick={onDone}>I have saved it</button>
      </div>
    </div>
  );
}

/** Set a new passphrase (first time, after recovery, or when changing). */
export function SetPassphrase({ onSet, submitLabel = 'Set passphrase', oldRecoveryCode }: { onSet: () => void; submitLabel?: string; oldRecoveryCode?: string }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  if (code) return <RecoveryCodeNotice code={code} onDone={onSet} shared={sharedPassphrase()} />;
  const submit = async () => {
    if (a !== b) return setError('The two entries do not match.');
    setBusy(true);
    try {
      const recoveryCode = await setPassphrase(a, { oldRecoveryCode });
      setA(''); setB('');
      setCode(recoveryCode);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
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
export function LockScreen({ onUnlock, onPresenter, notice }: { onUnlock: () => void; onPresenter: () => void; notice?: string }) {
  const [p, setP] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'unlock' | 'recover' | 'newpass' | 'upgrade' | 'shared'>('unlock');
  const [code, setCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [params, setParams] = useState<AuthParams | null>(null);
  const [reset, setReset] = useState('');
  useEffect(() => { void getParams().then(setParams); }, []);
  const cloud = !!params?.configured;
  const legacy = !loadLock() && !!getLocal().pinHash && !cloud;
  const submit = async () => {
    setBusy(true);
    const r = await unlock(p);
    setBusy(false);
    setP('');
    if (!r.ok) return setError(r.message);
    if (r.upgradeLegacy) return setMode('upgrade'); // the old 4-digit passcode must be replaced
    if (r.recoveryCode) { setNewCode(r.recoveryCode); return setMode('shared'); }
    onUnlock();
  };
  const recover = async () => {
    if (cloud) { setMode('newpass'); setError(''); return; } // checked by the server with the new passphrase
    const rec = loadLock();
    if (rec && (await verifyRecovery(rec, code))) { setMode('newpass'); setError(''); }
    else setError('That recovery code does not match.');
  };
  return (
    <div className="app"><div className="fullscreen">
      <h1 style={{ color: 'var(--amber)', letterSpacing: '.14em' }}>SOLMOURN</h1>
      {mode === 'unlock' && <>
        {notice && <p className="small" style={{ maxWidth: 320, color: 'var(--amber)' }}>{notice}</p>}
        <p className="muted">{legacy ? 'Enter your old DM passcode' : 'DM passphrase'}</p>
        <PassInput label={legacy ? 'Passcode' : 'Passphrase'} value={p} autoFocus onChange={(v) => { setP(v); setError(''); }} onEnter={submit} />
        {error && <p style={{ color: 'var(--bad)', maxWidth: 320 }}>{error}</p>}
        <button className="btn primary" disabled={busy || !p} onClick={submit}>{busy ? 'Checking…' : 'Unlock DM view'}</button>
        <button className="btn" onClick={onPresenter}>Open player view instead</button>
        <p className="small muted" style={{ maxWidth: 320 }}>The player view shows only player-safe content and needs no passphrase.</p>
        {!legacy && <button className="btn ghost sm" onClick={() => { setMode('recover'); setError(''); }}>Forgot the passphrase?</button>}
      </>}
      {mode === 'recover' && <>
        <p className="muted" style={{ maxWidth: 320 }}>Enter the recovery code you saved when you set the passphrase.</p>
        <input className="input" style={{ maxWidth: 320, fontFamily: 'ui-monospace, monospace' }} autoCapitalize="characters" aria-label="Recovery code" placeholder="XXXX-XXXX-XXXX-XXXX" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }} />
        {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}
        <button className="btn primary" disabled={!code} onClick={recover}>Use recovery code</button>
        <button className="btn ghost sm" onClick={() => setMode('unlock')}>Back</button>
        <details style={{ marginTop: 16, maxWidth: 320 }}>
          <summary className="muted small">Lost the recovery code too?</summary>
          {cloud ? (params?.resetAvailable ? <>
            <p className="small muted" style={{ margin: '8px 0' }}>Enter the value of the RESET_PASSPHRASE secret you added in Cloudflare. This clears the passphrase only; the campaign is kept. Then set a new one.</p>
            <PassInput label="RESET_PASSPHRASE value" value={reset} onChange={(v) => { setReset(v); setError(''); }} />
            <button className="btn danger sm" disabled={!reset} onClick={async () => {
              try { await cloudReset(reset); saveLock(null); setLocal({ pinHash: undefined }); location.reload(); } catch (e) { setError((e as Error).message); }
            }}>Clear the passphrase</button>
          </> : (
            <p className="small muted" style={{ margin: '8px 0' }}>In the Cloudflare dashboard open Workers &amp; Pages → solmourn → Settings → Variables and Secrets, and add a <strong>Secret</strong> named <code>RESET_PASSPHRASE</code> with any value you choose. Then reopen this screen: a reset box appears here. Your campaign is kept.</p>
          )) : <>
            <p className="small muted" style={{ margin: '8px 0' }}>Erase this device's campaign data and passphrase, then restore your latest backup file from Library → Backup &amp; restore. Without a backup, notes and characters on this device are lost; the campaign itself is reloaded.</p>
            <ConfirmBtn className="btn danger sm" confirm="Erase everything on this device?" onConfirm={async () => { await wipeAll(); saveLock(null); setLocal({ pinHash: undefined, presenter: false }); location.reload(); }}>Erase and reset</ConfirmBtn>
          </>}
        </details>
      </>}
      {mode === 'newpass' && <><p className="muted">{cloud ? 'Choose a new passphrase.' : 'Recovery code accepted. Choose a new passphrase.'}</p><SetPassphrase onSet={onUnlock} oldRecoveryCode={cloud ? code : undefined} /></>}
      {mode === 'upgrade' && <><p className="muted" style={{ maxWidth: 320 }}>Passcodes are replaced by passphrases. Choose one now (the old passcode stops working).</p><SetPassphrase onSet={onUnlock} /></>}
      {mode === 'shared' && <div style={{ maxWidth: 360 }}><RecoveryCodeNotice code={newCode} onDone={onUnlock} shared /></div>}
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
  const shared = sharedPassphrase();
  const configured = !!loadLock() || shared;
  if (!configured) {
    return (
      <div className="card">
        <div className="label">DM passphrase</div>
        <p className="small muted" style={{ marginBottom: 8 }}>Not set. Anyone holding this device can open the DM view. On the deployed site the passphrase you set here unlocks every device. It is asked when the app opens, when leaving Presenter mode, and before backups, restores and resets. It is never stored in readable form and is never in backups.</p>
        <SetPassphrase onSet={() => force((n) => n + 1)} />
      </div>
    );
  }
  const rec = loadLock();
  return (
    <div className="card">
      <div className="label">DM passphrase</div>
      <p className="small muted" style={{ marginBottom: 8 }}>
        {shared ? 'One passphrase for every device that opens this site. Changing it here signs the other devices out until they unlock with the new one.' : `Set ${rec ? new Date(rec.setAt).toLocaleDateString() : ''} on this device.`}
        {' '}Forgot it? Lock the app and use "Forgot the passphrase?" with your recovery code.
      </p>
      {!changing ? <button className="btn block" onClick={() => setChanging(true)}>{shared ? 'Change passphrase…' : 'Change passphrase or remove it…'}</button> : (
        <PassGate what="change the passphrase">
          <SetPassphrase submitLabel="Save new passphrase" onSet={() => { setChanging(false); force((n) => n + 1); }} />
          {!shared && <>
            <hr />
            <ConfirmBtn className="btn danger block" confirm="Leave the DM view unprotected?" onConfirm={() => { saveLock(null); setLocal({ pinHash: undefined }); setChanging(false); force((n) => n + 1); }}>Remove the passphrase</ConfirmBtn>
          </>}
        </PassGate>
      )}
    </div>
  );
}
