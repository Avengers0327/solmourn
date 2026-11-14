import { describe, expect, it } from 'vitest';
import { createLock, makeRecoveryCode, normalizeRecovery, validatePassphrase, verifyLegacyPin, verifyPassphrase, verifyRecovery } from '../src/domain/passphrase';
import { createHash } from 'node:crypto';

const FAST = 1_000; // fewer PBKDF2 rounds to keep the test quick; the app uses 210,000

describe('DM passphrase', () => {
  it('has no default and rejects short passphrases', () => {
    expect(validatePassphrase('')).toBeTruthy();
    expect(validatePassphrase('1234567')).toBeTruthy();
    expect(validatePassphrase('cold lamps')).toBeNull();
  });
  it('stores only salted hashes, never the passphrase or recovery code', async () => {
    const { record, recoveryCode } = await createLock('the everflame endures', FAST);
    const json = JSON.stringify(record);
    expect(json).not.toContain('everflame');
    expect(json).not.toContain(normalizeRecovery(recoveryCode));
    expect(record.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(record.hash).toMatch(/^[0-9a-f]{64}$/);
    const again = await createLock('the everflame endures', FAST);
    expect(again.record.hash).not.toBe(record.hash); // salted
  });
  it('verifies the right passphrase only', async () => {
    const { record } = await createLock('the everflame endures', FAST);
    expect(await verifyPassphrase(record, 'the everflame endures')).toBe(true);
    expect(await verifyPassphrase(record, 'The everflame endures')).toBe(false);
    expect(await verifyPassphrase(record, '')).toBe(false);
  });
  it('recovery code works regardless of case and dashes, and only that code', async () => {
    const { record, recoveryCode } = await createLock('the everflame endures', FAST);
    expect(recoveryCode).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
    expect(await verifyRecovery(record, recoveryCode.toLowerCase().replace(/-/g, ' '))).toBe(true);
    expect(await verifyRecovery(record, makeRecoveryCode())).toBe(false);
  });
  it('accepts the legacy numeric passcode once so it can be upgraded', async () => {
    const legacy = createHash('sha256').update('solmourn:4821').digest('hex');
    expect(await verifyLegacyPin(legacy, '4821')).toBe(true);
    expect(await verifyLegacyPin(legacy, '4822')).toBe(false);
  });
});
