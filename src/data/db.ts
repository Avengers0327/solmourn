// Offline storage: IndexedDB via Dexie, with versioned schema migrations.
import Dexie, { type Table } from 'dexie';
import type {
  AuditEvent, Branch, Campaign, CanonDecision, CanonRule, Clock, Clue, Doc, Encounter, GroupTrial, Location, LoreEntry,
  Lesson, MetaRecord, NPC, PC, Revelation, Scene, Session, SessionEvent, StatCard, TimelineEntry,
} from '../domain/types';

export const SCHEMA_VERSION = 2;

export class SolmournDB extends Dexie {
  campaigns!: Table<Campaign, string>;
  sessions!: Table<Session, string>;
  scenes!: Table<Scene, string>;
  npcs!: Table<NPC, string>;
  locations!: Table<Location, string>;
  lore!: Table<LoreEntry, string>;
  revelations!: Table<Revelation, string>;
  clues!: Table<Clue, string>;
  clocks!: Table<Clock, string>;
  events!: Table<SessionEvent, string>;
  pcs!: Table<PC, string>;
  canonDecisions!: Table<CanonDecision, string>;
  timeline!: Table<TimelineEntry, string>;
  audit!: Table<AuditEvent, string>;
  docs!: Table<Doc, string>;
  encounters!: Table<Encounter, string>;
  trials!: Table<GroupTrial, string>;
  canonRules!: Table<CanonRule, string>;
  meta!: Table<MetaRecord, string>;
  branches!: Table<Branch, string>;
  lessons!: Table<Lesson, string>;
  statCards!: Table<StatCard, string>;

  constructor(name = 'solmourn-companion') {
    super(name);
    // Migration 1: initial schema. Add new versions below; never edit a shipped one.
    this.version(1).stores({
      campaigns: 'id',
      sessions: 'id, index',
      scenes: 'id, sessionId, sequence',
      npcs: 'id, name',
      locations: 'id, name',
      lore: 'id, category',
      revelations: 'id, sessionIndex',
      clues: 'id, sessionIndex',
      clocks: 'id',
      events: 'id, sessionId, happenedAt, kind',
      pcs: 'id',
      canonDecisions: 'id',
      timeline: 'id, sort',
      audit: 'id, timestamp',
      docs: 'id',
      encounters: 'id',
      trials: 'id',
      canonRules: 'id',
      meta: 'key',
    });
    // Migration 2: branching state, DM Academy lessons, stat cards. Additive only -
    // existing tables and rows are untouched.
    this.version(2).stores({
      branches: 'id, sessionIndex',
      lessons: 'id, order',
      statCards: 'id',
    });
  }
}

export const db = new SolmournDB();

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
