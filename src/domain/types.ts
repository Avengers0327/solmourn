import type { SpeciesSelection } from './species';

// Domain model. Every campaign entity keeps DM-private text and player-approved text in
// SEPARATE fields; player-facing code may only ever read the player fields (see safe.ts).

export type Visibility = 'DM_ONLY' | 'PLAYER_SAFE' | 'REVEALED';
export type CanonStatus = 'LOCKED' | 'WORKING' | 'OPEN' | 'PLAYTEST' | 'RETIRED';
export type ClueStatus = 'NOT_SEEN' | 'HINTED' | 'FOUND' | 'INTERPRETED' | 'PUBLIC';
export type ResourceRecovery = 'SHORT_REST' | 'LONG_REST' | 'NONE' | 'CUSTOM';
export type Discipline = 'RADIANCE' | 'KINESIS' | 'VITALITY' | 'VEIL' | 'FORM' | 'ECHO';
export type ActionEconomy = 'ACTION' | 'BONUS' | 'REACTION' | 'PASSIVE' | 'REPLACES_ATTACK';

export interface Base {
  id: string;
  campaignId: string;
  createdAt: string; // ISO UTC
  updatedAt: string;
  revision: number;
  deletedAt?: string;
  sourceRef?: string; // provenance: "file.md § heading"
  /** Canon status is separate from visibility. Absent = not a canon claim (e.g. a play note). */
  canonStatus?: CanonStatus;
}

export interface Campaign extends Base {
  title: string;
  edition: '5e-2014';
  currentSessionId?: string;
  settings: Record<string, unknown>;
}

export interface Session extends Base {
  index: number;
  title: string;
  status: 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETE';
  visibility: Visibility; // governs whether the TITLE may appear in player exports
  arc?: string;
  levelRange?: string;
  questionMd: string;
  prepMd: string;
  dmNotesMd: string;
  playerRecapMd: string;
  currentSceneId?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface Scene extends Base {
  sessionId: string;
  title: string;
  descriptionMd: string;
  readAloudMd: string;
  sequence: number;
  status: 'PENDING' | 'ACTIVE' | 'DONE';
  visibility: Visibility;
}

export type NpcStatus = 'UNMET' | 'MET' | 'ALLY' | 'HOSTILE' | 'MISSING';
export interface NPC extends Base {
  name: string;
  role: string;
  locationId?: string;
  tags: string[];
  publicInfoMd: string; // player-approved
  privateInfoMd: string;
  wants: string;
  fears: string;
  knowsMd: string;
  mistakenBeliefsMd: string;
  relationship: string;
  lastSeen: string;
  /** Species is OPEN unless established; changing it never changes goals or role. */
  species?: string;
  status: NpcStatus;
  visibility: Visibility;
}

export interface Location extends Base {
  name: string;
  parentLocationId?: string;
  bodyMd: string; // private
  playerMd: string; // player-approved
  aliases: string[]; // private, never projected
  visibility: Visibility;
}

export interface LoreEntry extends Base {
  title: string;
  category: string;
  bodyMd: string; // private
  playerMd: string; // player-approved
  canonStatus: CanonStatus;
  order?: number;
  visibility: Visibility;
  tags: string[];
}

export interface Revelation extends Base {
  title: string; // private
  playerTitle: string;
  privateTruthMd: string;
  playerSafeSummaryMd: string;
  backupMd: string;
  prevailingBeliefMd?: string;
  whoKnowsMd?: string;
  earliestRevealMd?: string;
  sessionIndex: number;
  status: ClueStatus;
  visibility: Visibility;
  /** Words that are spoilers until this revelation is revealed (used by the export scanner). */
  spoilerTerms: string[];
}

export interface Clue extends Base {
  title: string; // private
  playerTitle: string;
  sessionIndex: number;
  sourceSceneId?: string;
  revelationIds: string[];
  status: ClueStatus;
  required: boolean;
  discoveryRoutes: string[];
  privateTextMd: string;
  playerTextMd: string;
  evidenceItem: string;
  discoveredSessionId?: string;
  discoveredBy: string[];
  visibility: Visibility;
}

export interface ClockChange {
  at: string;
  from: number;
  to: number;
  reason: string;
}
export interface Clock extends Base {
  name: string;
  value: number;
  max: number;
  meaningMd: string;
  /** 'core' clocks show on the cockpit; 'state' trackers live in Campaign state. */
  group?: 'core' | 'state';
  reasonHistory: ClockChange[];
}

export type EventKind = 'EVENT' | 'REVELATION' | 'NPC' | 'PROMISE' | 'THREAD' | 'WORLD_FACT' | 'RULING' | 'NEXT';
export interface SessionEvent extends Base {
  sessionId: string;
  happenedAt: string;
  kind: EventKind;
  textMd: string;
  visibility: Visibility;
  linkedEntityIds: string[];
  resolved?: boolean;
}

export interface Resource {
  key: string;
  name: string;
  current: number;
  max: number;
  recovery: ResourceRecovery;
}

export type Ability = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
export interface PC extends Base {
  name: string;
  player: string;
  /** Display name of the species. Kept for PCs made before the Divergence amendment. */
  ancestry: string;
  /** Species rules package (absent on older PCs = human, still valid). */
  species?: SpeciesSelection;
  classId: string;
  level: number;
  background: string;
  district: string;
  attunement: Discipline | 'UNATTUNED';
  specialty: string;
  abilities: Record<Ability, number>;
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  speed: number;
  conditions: string[];
  exhaustion: number;
  deathSaves: { successes: number; failures: number };
  resources: Resource[];
  patternIds: string[]; // Patternbook
  preparedIds: string[];
  highLevelUsed: number[]; // Pattern levels 6-9 already cast since the last long rest
  rigIds: string[]; // Machinist prepared devices
  skills?: string[];
  inventoryMd: string;
  connectionsMd: string;
  notesMd: string; // player-shareable
  privateNotesMd: string; // DM only (secrets)
}

export interface CanonDecision extends Base {
  topic: string;
  selectedOption?: string;
  options: string[];
  rejected: string[];
  status: CanonStatus;
  rationaleMd: string;
}

export interface TimelineEntry extends Base {
  whenLabel: string;
  sort: number;
  title: string;
  bodyMd: string; // private
  playerMd: string;
  canonStatus: CanonStatus;
  visibility: Visibility;
}

export interface AuditEvent {
  id: string;
  campaignId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  summary: string;
  beforeJson?: string;
  afterJson?: string;
  actor: 'DM' | 'IMPORT';
  timestamp: string;
}

export interface Doc extends Base {
  title: string;
  fileName: string;
  bodyMd: string;
  visibility: Visibility; // PLAYER_SAFE docs may be shown in Presenter mode
}

export interface Combatant {
  id: string;
  name: string;
  kind: 'PC' | 'NPC' | 'MONSTER';
  pcId?: string;
  init: number | null;
  initBonus: number;
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  conditions: string[];
  concentration: boolean;
  reactionUsed: boolean;
  out: '' | 'DOWN' | 'RETREATED' | 'SURRENDERED';
  notes: string;
}
export interface Encounter extends Base {
  name: string;
  objective: string;
  round: number;
  turnIndex: number;
  combatants: Combatant[];
  notesMd: string;
}

export interface GroupTrial extends Base {
  type: 'EMERGENT' | 'CONTROLLED';
  title: string;
  sessionId?: string;
  participants: string[];
  sources: string[]; // discipline sources / devices
  sharedAim: string;
  effect: string;
  stages: { name: string; dc: number; result: 'PENDING' | 'SUCCESS' | 'FAIL' | 'OVERRIDE' }[];
  consequencesMd: string;
  notesMd: string;
}

/** A branching decision point. The seed owns the text; the DM owns the choice. */
export interface BranchOption {
  id: string;
  label: string;
  stateChangesMd: string;
  downstreamMd: string;
}
export interface Branch extends Base {
  sessionIndex: number;
  title: string;
  preconditionMd: string;
  options: BranchOption[];
  recoveryMd: string;
  chosenOptionId?: string;
  chosenAt?: string;
  notesMd: string;
}

/** DM Academy lesson (DM-only coaching). */
export interface Lesson extends Base {
  order: number;
  title: string;
  minutes: number;
  summary: string;
  bodyMd: string;
  exerciseMd: string;
  done?: boolean;
}

/** PLAYTEST adversary / hazard card. Original numbers, not published stat blocks. */
export interface StatCard extends Base {
  name: string;
  kind: 'HUMAN' | 'MACHINE' | 'WILDLIFE' | 'HAZARD';
  tier: string;
  ac: number;
  hp: number;
  initBonus: number;
  speed: string;
  attacksMd: string;
  traitsMd: string;
  tacticsMd: string;
  scalingMd: string;
}

/** A consistency assertion, stored as data so the rule text itself stays private. */
export interface CanonRule {
  id: string;
  campaignId: string;
  severity: 'error' | 'warning';
  pattern: string; // RegExp source
  flags: string;
  /** If set, a match is only a problem when the matched text differs from this exact string. */
  mustEqual?: string;
  /** Skip sentences that contain a negation ("not sabotage"). */
  negationAware?: boolean;
  message: string;
  suggestion: string;
  exemptIds: string[];
}

export interface MetaRecord {
  key: string;
  value: unknown;
}

// ---- Rules content (data-driven homebrew) ----
export interface FeatureDefinition {
  id: string;
  classId: string;
  level: number;
  name: string;
  rulesMd: string;
  actionEconomy?: ActionEconomy;
  /** [minLevel, uses] steps; 'PB' = proficiency bonus. Highest step at or below the PC's level wins. */
  uses?: [number, number | 'PB'][];
  recovery?: ResourceRecovery;
  /** Other resource keys that one use of this feature also consumes. */
  alsoConsumes?: { key: string; amount: number }[];
}
export interface ClassDefinition {
  id: string;
  name: string;
  hitDie: number;
  mainAbility: string;
  saves: string;
  summary: string;
  proficienciesMd: string;
  skillChoices?: { count: number; from: string[] };
  loadoutMd?: string;
  features: FeatureDefinition[];
  playtestStatus: CanonStatus;
}
export interface DeviceDefinition {
  id: string;
  name: string;
  actionEconomy: ActionEconomy;
  actionText: string;
  effectMd: string;
}
export interface Pattern {
  id: string;
  name: string;
  publishedName?: string;
  duration?: string;
  ritual?: boolean;
  components?: string;
  school?: string;
  upcastMd?: string;
  origin?: 'SRD' | 'PHB' | 'ORIGINAL' | 'SUPPLEMENT' | 'UA';
  status?: 'MAPPED' | 'EXCLUDED';
  excludedReason?: string;
  /** Book codes that print this spell (deduplicated across books). */
  sources?: string[];
  verification?: 'SRD_VERIFIED' | 'CROSS_CHECKED' | 'ORIGINAL' | 'UNOFFICIAL';
  /** Disagreements between the data sources, recorded rather than resolved silently. */
  discrepancies?: string[];
  mappingNote?: string;
  /** True when the discipline is a judgement call the DM should confirm. */
  ambiguous?: boolean;
  tags?: string[];
  /** DM_ONLY Patterns never appear in player-facing browsing or search. Default PLAYER_SAFE. */
  visibility?: 'PLAYER_SAFE' | 'DM_ONLY';
  discipline: Discipline;
  level: number;
  rpCost: number;
  action: string;
  range: string;
  concentration: boolean;
  source: string;
  rulesMd?: string;
  licensedTextAvailable: boolean;
}

export const TABLES = [
  'campaigns', 'sessions', 'scenes', 'npcs', 'locations', 'lore', 'revelations', 'clues', 'clocks',
  'events', 'pcs', 'canonDecisions', 'timeline', 'audit', 'docs', 'encounters', 'trials', 'canonRules', 'meta',
  'branches', 'lessons', 'statCards',
] as const;
export type TableName = (typeof TABLES)[number];

export interface BackupFile {
  manifest: {
    app: 'solmourn-companion';
    kind: 'backup' | 'starter-pack';
    formatVersion: 1;
    schemaVersion: number;
    seedVersion?: number;
    exportedAt: string;
    counts: Record<string, number>;
  };
  tables: Partial<Record<TableName, unknown[]>>;
}

export const CAMPAIGN_ID = 'solmourn';
