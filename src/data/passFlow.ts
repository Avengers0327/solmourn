// One DM passphrase for every device. When the app runs on the deployed site the server holds the
// passphrase (as a stretched hash) and decides; each device also keeps a local copy of the check
// so it can unlock offline. Without a server (local preview), the passphrase is per device as before.
import { createLock, loadLock, saveLock, validatePassphrase, verifyLegacyPin, verifyPassphrase } from '../domain/passphrase';
import { getLocal, setLocal } from '../ui/state';
import { CloudError, cloudChange, cloudLogin, cloudRecover, cloudSetup, getCloud, getParams, syncNow } from './cloud';

/** True when the DM view must be unlocked on this device. */
export const lockConfigured = () => !!loadLock() || !!getLocal().pinHash || !!getCloud().configured;
/** True when the passphrase is shared through the server (changes need a connection). */
export const sharedPassphrase = () => !!getCloud().configured;

/** Local check only (used to re-confirm protected actions). */
export async function checkLocal(p: string): Promise<boolean> {
  const rec = loadLock();
  if (rec) return verifyPassphrase(rec, p);
  const legacy = getLocal().pinHash;
  if (legacy) return verifyLegacyPin(legacy, p);
  return !getCloud().configured;
}

async function mirrorLocally(p: string) {
  const rec = loadLock();
  if (rec && (await verifyPassphrase(rec, p))) return;
  saveLock((await createLock(p)).record);
  setLocal({ pinHash: undefined });
}

export type UnlockResult =
  | { ok: true; upgradeLegacy?: boolean; recoveryCode?: string }
  | { ok: false; message: string };

const WRONG = 'That is not the passphrase.';

export async function unlock(p: string): Promise<UnlockResult> {
  const params = await getParams();
  if (params?.configured) {
    try {
      await cloudLogin(params, p);
      await mirrorLocally(p);
      return { ok: true };
    } catch (e) {
      if (e instanceof CloudError && e.status === 401) return { ok: false, message: WRONG };
      if (e instanceof CloudError && e.status === 429) return { ok: false, message: e.message };
      // Server unreachable mid-way: fall back to this device's copy.
    }
  }
  const rec = loadLock();
  const legacy = getLocal().pinHash;
  if (!rec && !legacy) {
    return getCloud().configured ? { ok: false, message: 'Connect to the internet to unlock this device the first time.' } : { ok: true };
  }
  const ok = rec ? await verifyPassphrase(rec, p) : await verifyLegacyPin(legacy!, p);
  if (!ok) return { ok: false, message: WRONG };
  if (!rec) return { ok: true, upgradeLegacy: true };
  if (params && !params.configured) {
    // First device to reach the server: this passphrase becomes the one for every device.
    try {
      const { record, recoveryCode } = await createLock(p);
      await cloudSetup(p, recoveryCode);
      saveLock(record);
      return { ok: true, recoveryCode };
    } catch {
      /* stays local; try again next unlock */
    }
  }
  return { ok: true };
}

/**
 * Set, change or (with the old recovery code) reset the passphrase. Returns the new recovery
 * code, which works on every device. Throws an Error with a message for the DM on failure.
 */
export async function setPassphrase(p: string, opts: { oldRecoveryCode?: string } = {}): Promise<string> {
  const problem = validatePassphrase(p);
  if (problem) throw new Error(problem);
  const params = await getParams();
  if (!params && getCloud().configured) throw new Error('Connect to the internet first: the passphrase is shared by all your devices.');
  const { record, recoveryCode } = await createLock(p);
  if (params) {
    try {
      if (!params.configured) await cloudSetup(p, recoveryCode);
      else if (opts.oldRecoveryCode) await cloudRecover(params, opts.oldRecoveryCode, p, recoveryCode);
      else await cloudChange(p, recoveryCode);
    } catch (e) {
      if (e instanceof CloudError && e.status === 401) throw new Error(opts.oldRecoveryCode ? 'That recovery code does not match.' : 'Lock the app and unlock it again, then try once more.');
      throw new Error(e instanceof CloudError ? e.message : 'Could not reach the server. Nothing was changed.');
    }
  }
  saveLock(record);
  setLocal({ pinHash: undefined });
  if (params) void syncNow('passphrase set');
  return recoveryCode;
}
