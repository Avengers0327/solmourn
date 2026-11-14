import { createContext, useContext } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import type { EventKind, TableName } from '../domain/types';
import type { TrialConfig } from '../domain/rules';

export type SheetSpec =
  | { type: 'npc' | 'clue' | 'revelation' | 'lore' | 'location' | 'timeline' | 'decision' | 'pc' | 'pcEdit' | 'clock' | 'session' | 'recap' | 'trial' | 'event' | 'lesson'; id: string }
  | { type: 'doc'; id: string; find?: string }
  | { type: 'cast'; id: string }
  | { type: 'readAloud'; id: string }
  | { type: 'note'; kind?: EventKind; text?: string }
  | { type: 'new'; table: TableName }
  | { type: 'dice' | 'initiative' | 'revealClue' | 'search' | 'share' | 'backup' | 'checks' | 'rules' | 'patterns' | 'history' | 'settings' | 'status' | 'npcList' | 'clueList' | 'quickAdd' | 'newPc' | 'sessions' | 'notes' | 'decisions' | 'academy' | 'spells' | 'statCards' | 'branches' | 'state' | 'seedReport' | 'createPc' | 'speciesCatalog' };

export type Tab = 'now' | 'world' | 'party' | 'mysteries' | 'library';
export interface Nav {
  open: (s: SheetSpec) => void;
  close: () => void;
  setTab: (t: Tab) => void;
  enterPresenter: () => void;
}
export const NavCtx = createContext<Nav>({ open: () => {}, close: () => {}, setTab: () => {}, enterPresenter: () => {} });
export const useNav = () => useContext(NavCtx);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = (name: TableName) => (db as any)[name] as import('dexie').Table<any, string>;

/** Live rows of a table, excluding soft-deleted ones. Empty array while loading. */
export function useRows<T>(name: TableName): T[] {
  return useLiveQuery(async () => (await tbl(name).toArray()).filter((r) => !r.deletedAt) as T[], [name]) ?? [];
}
export function useRow<T>(name: TableName, id: string | undefined): T | undefined {
  return useLiveQuery(async () => (id ? ((await tbl(name).get(id)) as T | undefined) : undefined), [name, id]);
}
export function useMeta<T>(key: string): T | undefined {
  return useLiveQuery(async () => (await db.meta.get(key))?.value as T | undefined, [key]);
}
export const useTrialConfig = () => useMeta<TrialConfig>('trialConfig');

// ---- device-local settings (never part of backups) ----
const LS = 'solmourn.local';
export interface LocalSettings {
  pinHash?: string;
  presenter?: boolean;
  timeZone?: string;
  lastBackupAt?: string;
  introSeen?: boolean;
}
export const getLocal = (): LocalSettings => {
  try {
    return JSON.parse(localStorage.getItem(LS) ?? '{}');
  } catch {
    return {};
  }
};
export const setLocal = (patch: Partial<LocalSettings>) => localStorage.setItem(LS, JSON.stringify({ ...getLocal(), ...patch }));

/** @deprecated legacy 4-digit passcode hash; kept only so old installs can unlock once and upgrade. */
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`solmourn:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function fmtTime(iso: string | undefined): string {
  if (!iso) return '';
  const tz = getLocal().timeZone;
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz || undefined });
  } catch {
    return new Date(iso).toLocaleString();
  }
}
