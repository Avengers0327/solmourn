# CLAUDE CODE HANDOFF — SOLMOURN COMPANION

> **Implementation specification / build brief.** Give this entire Markdown file and the four accompanying Markdown files to Claude Code. Build a **mobile-first iPhone campaign management app for one DM**, not a desktop dashboard with a tiny responsive layout.
>
> **Critical privacy:** `01_DM_STORY_BIBLE.md`, `03_DM_ROADMAP.md`, and `04_FIRST_TIME_DM_FIELD_GUIDE.md` contain hidden campaign truth. `02_PLAYER_GUIDE.md` is player-safe. **Never display private facts, hidden timeline events, NPC secrets, or unrevealed clues in a player-facing view, search response, export, notification, widget, or shared URL.**

## 1. Product mission

Create **Solmourn Companion**, an iPhone-first app that keeps all lore, sessions, NPCs, class features, mysteries, PCs, clues, clocks and revisions organized while a first-time DM runs an 8-session D&D campaign. The DM expects to use it **almost entirely on an iPhone**, including during sessions. It must be extremely fast to operate with one hand, work offline, and prevent story contradictions and accidental spoilers.

This is **a campaign notebook and session cockpit**, not an automated AI game master. It should make the DM's judgment easier, not overwrite the story or force decisions.

### User roles

1. **DM (owner):** full access; can draft lore, run sessions, reveal clues, export backups and edit canon.
2. **Player (optional Phase 2):** access only explicitly safe and revealed materials. In MVP, a safer alternative is a **player-safe export generator** rather than a signed-in player portal.

### Non-goals for MVP

- No autonomous plot generation or changing canon without explicit approval.
- No real-money payments, ads, social feed, arbitrary public accounts or cloud requirement.
- No mandatory internet to open campaign, roll dice, navigate or take notes.
- No automatic publication of DM-only information.
- No promise of importing copyrighted 5e rules text that the user has not supplied or licensed.
- No generic all-campaign character builder requiring support for every D&D subclass on launch.

## 2. Proposed technical stack and platform strategy

**Preferred implementation:** **Expo React Native + TypeScript + Expo Router** targeting iOS, with responsive compatibility for Android as optional. Use **SQLite** for offline-first structured data and **file-system document storage** for imported Markdown/media. Use a typed domain model and repository layer so local-only MVP can later add encrypted/signed-in synchronization.

**Why:** Native touch interactions, local storage, iOS share sheet, camera/files import, clipboard, haptics, and eventual TestFlight deployment. A Mac is not required for **day-to-day use** once installed. Building/distributing an iOS binary may require an Apple Developer account and Apple build/signing services; be transparent about this. The user may use Claude Code on a development machine or hosted environment during development, but **the finished product must be usable solely from iPhone**.

**Fallback if iOS signing is a blocker:** ship an **installable, offline-capable PWA** with equivalent core features first, then migrate UI/domain packages to native Expo. Don't secretly substitute a browser-only app and claim it is a native iOS build. Ask user only about constraints that materially block deployment.

Recommended packages only after verifying current stable compatibility: Expo Router, expo-sqlite, expo-file-system, expo-document-picker, expo-sharing, expo-haptics, React Native Markdown renderer, React Hook Form, Zod, Zustand or equivalent small state store, date utilities. Avoid excessive dependencies, especially for 3rd-party calendar/chat services.

**Local backup requirement:** a single tap to **export complete campaign data** (SQLite-derived JSON + Markdown exports + assets + manifest version) to iOS Files. Restore must be tested. No always-on server dependency; consider iCloud Drive backup as user-directed export, not silent sync.

## 3. Design goals (iPhone in hand while narrating)

- **Portrait-first**, thumb-friendly tap targets at least ~44×44 pt, readable on a narrow screen and in low light.
- Native-feeling **dark mode** by default, amber light accents with cool slate backgrounds, good contrast; theme should never imply darkness is evil.
- **2 taps or fewer** from session cockpit to reveal clue, change clock, open NPC, or make a quick note.
- Fast initial load of last active campaign/session from local database.
- **Global search** with scopes: `DM Private`, `Player Safe`, `Revealed`, `All`; default search must be **private on the DM device** and entirely isolated from player mode.
- No tiny spreadsheets or multi-column editing screens; use stacked cards, bottom sheets, swipe actions with confirmation for destructive operations.
- Offline dice roller, initiative tracker, simple countdown/clock chips, and combat notes.
- Screen reader labels, Dynamic Type text sizing, haptics optional; never communicate game status through color alone.
- Context-aware quick actions and undo for accidental clock advances or clue reveals.

### Suggested tabs

1. **Now** — current session cockpit.
2. **World** — lore, locations, factions, NPCs, timeline.
3. **Party** — PCs, conditions, class features, RP, notes.
4. **Mysteries** — clue graph, reveals, unresolved threads, timelines and Dissonance/Concordance concepts.
5. **Library** — imported docs, rules, search, settings, export and canon decisions.

Use a persistent quick-add button for note/NPC/clue/session event and a contextual bottom sheet. Avoid a sixth tab just for admin screens.

## 4. Core workflows and screens

### A. First launch/import

1. Show a short explanation of **DM-private content** vs **player-safe content**.
2. Offer **Import Solmourn Starter Pack** (the four docs plus this specification) with preseeded structured records where safely parseable.
3. Show an **import preview**: count of sessions, NPCs, setting entries, class options, lore decisions. Every record has provenance (`source_file`, `heading`, original text pointer, visibility, canon status).
4. Require confirmation before committing. Never silently replace existing edited lore on re-import; produce a diff and options (`keep mine`, `use incoming`, `merge as new draft`).
5. Ask for local passcode/biometric gate for **DM-only access** if device capabilities permit; don't lock user out of offline backup if biometric availability changes.
6. Start in **Session 1: The First Flicker** with the session not yet begun.

### B. Session cockpit — main screen

```
SOLMOURN                        S01 • THE FIRST FLICKER
[Start / Pause / End session]    [Safety pause]

CURRENT SCENE     Frostward blackout
[Read-aloud] [Reveal clue] [New twist]

CLOCKS
Everflame deterioration  [● ○ ○ ○ ○ ○]  + / Undo
ORS scrutiny             [○ ○ ○ ○ ○ ○]  + / Undo
Public unrest           [● ○ ○ ○ ○ ○]  + / Undo

QUICK ACCESS
[NPCs] [Clues] [Initiative] [Dice] [Party] [Notes]

UP NEXT  Station F-17 / Mara's lead
UNRESOLVED   Where is Tomas?  •  Missing 43

[+ Add note]  [↪ Recap last scene]
```

**Must work without network.** Autosave note drafts in local storage immediately. Timestamp in user-configured time zone, but store ISO UTC in database. Support one-tap undo with brief snackbar. Never advance a plot clock just because app timer ticks unless DM opted into a session-time rule.

### C. NPC card

Fields: public name, role, location, portrait optional, tags, wants, fears, what they know, what they mistakenly believe, DM secret, relationship to party, current status, last seen, timeline entries. **One tap to mark met / hostile / ally / missing.** Public and private fields must be separately labeled and backed by distinct visibility controls.

### D. Clue/revelation graph

Every clue has: title, source scene, revelation links, required/optional flag, discovery routes, status (`not_seen`, `hinted`, `found`, `interpreted`, `public`), visibility, discovered_by PC IDs, discovered_session, evidence item, player-safe wording, private truth. Each essential revelation can have 3+ clue routes. **DM-only reveal action** makes a designated player-safe summary available to exports; it never exposes raw DM notes or the Story Bible.

### E. Timeline + canon registry

Two timelines: **world history** (e.g., ~2180 discovery, ~2230 the Sundering, exactly simultaneous First Concordances, ~700 years later present) and **at-table history** (what PCs actually did). Every entry has `LOCKED`, `WORKING`, `OPEN`, `PLAYTEST`, or `RETIRED` status, plus `DM_ONLY`/`PLAYER_SAFE`/`REVEALED` visibility. A conflict detector surfaces these checks:

- Name of catastrophe is **the Sundering** (not stylized SUNDering).
- **Eight artificial suns manifested at exactly the same moment** in involuntary crisis-born Emergent Concordances; later technology stabilizes them.
- Original Concordants become elites; modern governments are diverse.
- Natural sun remains luminous behind fictional Dissonance barrier; not physically destroyed.
- Everflame fails from real aging machinery, not hidden sabotage.
- Solmourn overlies NYC but players learn this only when revealed.
- Collective name for eight cities **undecided**; **Pyres rejected**, **Cinders not approved**.
- **Human PCs only**, six disciplines, individual or collective Unbound, prophecy undisclosed at start.

**Show conflicts as warnings and proposed corrections, not automatic edits**. Require owner confirmation and log the decision in a change history.

### F. Party/PC sheet

Name, class, level, background, district, skills, ability scores, modifiers, HP/max HP/temp HP, AC, initiative, speed, proficiency, conditions, death-save counters, inventory, connections, secrets, notes. For Resonant: selected discipline, Patternbook, prepared Patterns, current/max RP, Amplification uses (0–2), Emergency Overcasting available, strain/exhaustion flags. For Machinist: prepared rigs and uses; Votary: Field Treatment/Rally/healer kit; Warden/Shade/Strider: class resources and trait reminders. Include **one-tap short/long rest** that prompts for confirmation and never resets outside correct rules.

**Homebrew schema must be data-driven:** don't embed rules as scattered conditional UI code; store feature definitions, actions, charges, recovery, dice and wording in typed records.

### G. Initiative / encounter runner

- Add PCs/NPCs/monsters; initiative via manual number or offline d20 roller; sort descending.
- Track HP, temp HP, AC, conditions, concentration, reaction used, current round.
- Quick damage/healing +/-; configurable damage types only if helpful.
- Encounter objectives (rescue, disable mechanism, survive 3 rounds), retreat/surrender status.
- Preloaded **placeholder/reskinned stat cards only**; do not redistribute full third-party rulebook text.
- Never silently change monsters' HP for difficulty adjustments.

### H. Spell/Pattern and overcasting assistant

- Search Patterns by **discipline, level, concentration, action, range, and source**. Distinguish fully licensed/DM-authored content from references to published spells.
- Show exact RP cost, caster level max access, current RP, high-level limitations and whether Pattern is in book/prepared.
- **Amplification calculator:** tier +1..+4, bonus type, extra RP, strain die, CON DC, total cost, uses remaining. Explicitly allow cantrips and level 9 with valid resources. Apply one enhancement only; reject impossible combinations.
- **Emergency Overcasting calculator:** borrow max 2 RP, damage 1d6 per RP, CON DC 10+2×borrowed; cannot stack with Amplification.
- Calculate/display; **never auto-cast**, spend points, roll exhaustion, or write canon without user confirmation.

### I. Concordance tracker

Two types:
- **Emergent**: crisis event, participants, shared aim, discipline sources/devices, stage results (DC13 establish, DC15 hold, DC16 resolve; GM override), consequences and narrative observations.
- **Controlled**: group daily-use charge, participant list, 2 distinct discipline sources, resource cost by caster or energy cell, joint check, duration/concentration, chosen bounded effect. Prevent it from being used to create a ninth sun or solve planetary restoration as a routine action.

**Important:** Do not suggest individual/collective Unbound results to players before revelation. In DM view, record possible progression without declaring destiny.

### J. Session recap and planning

Session notes auto-organized into: **events, revelations, NPC status, party promises, unresolved threads, world facts introduced, rule calls to review, next-session intentions**. A tap can propose a structured summary for DM review; never assume an AI summary is factual. A player recap export must run spoiler filter and show preview.

### K. Safe sharing/export

Generate **player recap Markdown/PDF later**, player-known NPCs, player-known places, and character sheets, with **allowlist-based inclusion**. Default denied for anything not explicitly marked as player-safe or revealed. Avoid relying solely on text redaction; strip entire private fields and linked notes before formatting. For the MVP, export Markdown/text or plain share sheet; PDF can be Phase 2.

## 5. Data model — implement migrations, not loose JSON blobs

Use stable string IDs (UUID or ULID), `created_at`, `updated_at`, `deleted_at` (soft delete where needed), `campaign_id`, `revision`, and explicit visibility fields. Audit changes that affect canon/reveals/resources.

```ts
type Visibility = 'DM_ONLY' | 'PLAYER_SAFE' | 'REVEALED';
type CanonStatus = 'LOCKED' | 'WORKING' | 'OPEN' | 'PLAYTEST' | 'RETIRED';
type ClueStatus = 'NOT_SEEN' | 'HINTED' | 'FOUND' | 'INTERPRETED' | 'PUBLIC';
type ResourceRecovery = 'SHORT_REST' | 'LONG_REST' | 'NONE' | 'CUSTOM';

interface Campaign { id: string; title: string; edition: '5e-2014'; currentSessionId?: string; settings: Record<string, unknown>; }
interface LoreEntry { id: string; campaignId: string; title: string; bodyMd: string; category: string; visibility: Visibility; canonStatus: CanonStatus; tags: string[]; sourceRef?: string; revision: number; }
interface Location { id: string; campaignId: string; name: string; parentLocationId?: string; bodyMd: string; visibility: Visibility; aliases: string[]; }
interface NPC { id: string; campaignId: string; name: string; role: string; locationId?: string; publicInfoMd: string; privateInfoMd: string; wants?: string; fears?: string; knowsMd?: string; mistakenBeliefsMd?: string; status: string; visibility: Visibility; }
interface Session { id: string; campaignId: string; index: number; title: string; status: 'PLANNED'|'ACTIVE'|'COMPLETE'; prepMd: string; dmNotesMd: string; playerRecapMd: string; startedAt?: string; endedAt?: string; }
interface Scene { id: string; sessionId: string; title: string; descriptionMd: string; sequence: number; status: string; visibility: Visibility; }
interface Revelation { id: string; campaignId: string; title: string; privateTruthMd: string; playerSafeSummaryMd: string; status: ClueStatus; visibility: Visibility; }
interface Clue { id: string; campaignId: string; title: string; sourceSceneId?: string; revelationIds: string[]; status: ClueStatus; required: boolean; discoveryRoutes: string[]; privateTextMd: string; playerTextMd: string; discoveredSessionId?: string; visibility: Visibility; }
interface PC { id: string; campaignId: string; name: string; classId: string; level: number; districtId?: string; abilities: Record<string,number>; hp: number; maxHp: number; tempHp: number; ac: number; proficiencyBonus: number; attunement?: string; notesMd: string; privateNotesMd: string; }
interface ClassDefinition { id: string; name: string; hitDie: number; features: FeatureDefinition[]; playtestStatus: CanonStatus; }
interface FeatureDefinition { id: string; classId: string; level: number; name: string; rulesMd: string; actionEconomy?: 'ACTION'|'BONUS'|'REACTION'|'PASSIVE'; maxUses?: number; recovery?: ResourceRecovery; }
interface Pattern { id: string; name: string; discipline: 'RADIANCE'|'KINESIS'|'VITALITY'|'VEIL'|'FORM'|'ECHO'; level: number; rpCost: number; action: string; range: string; concentration: boolean; source: string; rulesMd?: string; licensedTextAvailable: boolean; }
interface Resource { id: string; pcId: string; kind: string; current: number; max: number; recovery: ResourceRecovery; }
interface Clock { id: string; campaignId: string; name: string; value: number; max: number; meaningMd: string; reasonHistory: string[]; }
interface SessionEvent { id: string; sessionId: string; happenedAt: string; kind: string; textMd: string; visibility: Visibility; linkedEntityIds: string[]; }
interface CanonDecision { id: string; campaignId: string; topic: string; selectedOption?: string; status: CanonStatus; rationaleMd: string; createdAt: string; }
interface AuditEvent { id: string; campaignId: string; eventType: string; entityType: string; entityId: string; beforeJson?: string; afterJson?: string; actor: 'DM'|'IMPORT'; timestamp: string; }
```

**Implementation caveat:** These are logical interfaces, not full finalized DB tables. Separate public/private columns and many-to-many join tables appropriately. Enforce referential integrity, DB migrations, and restoration tests. **Visibility is not just UI styling**; implement filtering at data access/serialization boundaries. A single local-device owner role is adequate MVP, but sharing features require a separate, audited safe projection.

## 6. Canon seed content (from documents; protect spoilers)

### Seed world and play structures

- City: Solmourn, six districts, Everflame, Solar Imperium, ORS, Mara Venn, Tomas Venn, Joren Pike, Seren Vale.
- Sessions: exactly eight, titled as in `03_DM_ROADMAP.md`, all `DM_ONLY` until session-safe opening text explicitly shared.
- Clocks: Everflame degradation 1/6, ORS scrutiny 0/6, public unrest 1/6 (editable starting state, not automatic fact of player knowledge).
- Six Resonance disciplines; RP cost table; full caster level progression; Amplified/Emergency overcasting rule cards.
- Classes Warden, Shade, Machinist, Resonant, Votary, Strider; status `PLAYTEST`; human-only.
- Lore facts marked `LOCKED`, `WORKING`, `OPEN` exactly as `01_DM_STORY_BIBLE.md` says.

### Absolutely private until discovered

- Solmourn = old New York City.
- Other surviving cities, including Vesperdeep and their governments.
- The First Concordance's exact true history and original Unattuned contribution.
- The sun remaining luminous behind the planetary boundary.
- The Sixth Canticle, Singular/Collective Unbound, possibility of Unity.
- Exact nature of the Everflame's deterioration and its finale solutions until revealed by play.

**Special case:** The player guide may publicly discuss *Resonance as six disciplines* and ordinary Attunement, but not Dissonance as the original cause of the Sundering, the other cities, or the prophecy.

## 7. Search, indexing, imports

- Full-text search all relevant local entities using an indexed store. Each result has **visibility** and **reveal status** chips. DM search defaults to private but makes the current visibility obvious.
- Search examples: `Where is Tomas?`, `What does Seren know?`, `Radiance level 2`, `Ramapo`, `First Concordance`, `what has the party learned?`.
- Support keyword search immediately; optional **offline semantic search** can wait. Do **not** send private lore to a cloud LLM automatically.
- Markdown import: parse frontmatter optionally, preserve headings/canonical raw text, track provenance, and surface parsing uncertainty. Don't guess that every heading is a database entity.
- Cross-link stable entity IDs rather than brittle display names. Aliases such as Solmourn/Old New York should be treated as secret where relevant.
- Create conflict-check rules as explicit assertions with severity and evidence rather than relying on an AI guess.

## 8. Privacy and safety architecture

**Threat model:** primary risk is **accidentally spoiling the story while showing or exporting the phone**, not a hostile internet attacker. Also consider lost phone and backups.

- DM-only private content behind a deliberate owner mode with optional biometric/local passcode gate.
- **Presenter mode**: large text, safe-only search and cards, no secret previews or notification text. Lock the content source filter even if the user swipes/searches unexpectedly.
- Player-safe exports use **deny-by-default** projections. A `REVEALED` flag should attach to an **approved player-summary field**, not cause all linked private data to leak.
- No private data in push notifications, lock-screen widgets, crash logs, analytics, clipboard by default, or app screenshots used in tests.
- Local databases/backups use OS-protected storage; if encrypted export is introduced, require recovery and restore testing.
- Add a **spoiler-leak regression test suite**: exporting a session-1 player recap must never contain `New York`, `Manhattan`, `Mahwah`, `Ramapo`, `Vesperdeep`, `Unbound`, `Sixth Canticle`, `planetary boundary`, `seven other cities`, `First Concordance` unless their records were explicitly revealed. Some names may appear in future player recaps *after reveal*; evaluate visibility, not permanent word blacklist.
- Safeguard game safety notes (lines/veils) as private, not player-view content unless intentionally shared.

## 9. Work plan for Claude Code (deliver in stages)

### Phase 0 — architecture and initial repository

- Produce concise architecture decision record and dependency compatibility audit for **current Expo/iOS targets**.
- Create TypeScript project, lint/format/test scripts, type-safe data layer, navigation shell and example seed data.
- Create a README with exact setup, iPhone preview, testing, build and offline verification steps. State where a computer/cloud build is needed.

### Phase 1 — useful offline DM MVP (ship this first)

- Import four `.md` content sources with privacy labels, revision/provenance.
- Home/current session cockpit, 8 session outline, scene notes, NPC list, clue tracker, three clocks, searchable lore.
- Manual session event logging, undo and export/import backup.
- Dark mode, accessibility baseline, large tap targets.
- **Acceptance:** run all normal session 1 duties on airplane mode, no terminal required on iPhone.

### Phase 2 — party and rules assistant

- PCs, stat/resources, turn/initiative, condition counters, offline dice.
- Six class rule cards and level tables as **PLAYTEST**, not official; RP tracker and Pattern/Amplification calculator.
- Concordance trial and controlled-session tracker.
- **Acceptance:** level-3 Resonant with 14 RP casts level-2 Pattern for 3 RP; +2 Amplification adds 4 RP/2d6 strain/DC15 and counts one of two uses; cantrip amplification costs only bonus RP; Emergency borrow can't stack. Short/long rests restore correct resources only.

### Phase 3 — spoiler-safe sharing and canon integrity

- Presenter mode, player-safe recap export, preview confirmation, reveal status.
- Lore decision board, history and conflict warnings, review/diff for reimports.
- **Acceptance:** can share session 1 recap without exposing New York or other hidden truths; reveal of one clue does not expose its entire private linked note.

### Phase 4 — polished iOS distribution (optional enhancements)

- Camera attachment capture, searchable scans if user opted in (avoid mandatory OCR), smart link previews, optional iCloud import/export, widgets with **no secret content**, printable player sheets.
- Optional authentication/cloud sync only with clear encryption/roles/conflict behavior and opt-in. Support TestFlight or installed PWA fallback with transparent instructions.

## 10. Explicit test cases

**Offline and durability**
- Create session note offline, force-kill app, reopen; note persists.
- Export backup to Files, delete test DB, restore; entity counts and relationships intact.
- Re-import updated Story Bible: modified NPC does not overwrite unsynced DM edits silently.
- App opens latest session without network or server.

**Gameplay**
- PB +2 at level 3. Standard/variant human only in creation UI.
- Machinist Shock Projector **replaces** a single attack; cannot become a free extra action.
- Votary Treatment consumes both an ability use and healer kit charge.
- 0 RP cantrip is legal; amplification extra RP and strain still apply.
- Spell levels 6–9 enforce once-per-long-rest ceiling.
- Caster with only Radiance cannot casually prepare Vitality spell.
- No party member is automatically assigned Unbound identity.

**Lore consistency**
- Store the **Sundering** correctly.
- Historical query shows exactly **eight simultaneously manifesting Cores** from involuntary distress-born Concordance.
- Engineered systems **stabilize** existing Cores; they never invent them retroactively.
- Vesperdeep is politically different from Solmourn; roster/governments remain `WORKING`.
- `Pyres` is rejected and `Cinders` is a candidate; app must not show either as final canon.
- The original Concordants become elites; that does **not** imply all modern cities are autocracies.

**Spoiler privacy**
- Search in Presenter/player mode does not surface hidden entities, snippets, aliases or cross-linked titles.
- Export before session 4 does not include “old New York” identity.
- Reveal one safe summary, then export: shows summary only, never DM truth.
- Share sheet preview is spoiler-safe.
- Lock screen notifications never display private lore.

**Accessibility/usability**
- Reach “mark clue found” from Now screen in ≤2 taps.
- Reach “initiative next turn” in ≤2 taps.
- No horizontal scrolling required on 375 pt viewport.
- Interface remains legible with enlarged text and VoiceOver.

## 11. Deliverables Claude Code must provide

1. Running Expo React Native TypeScript source (or PWA fallback *explicitly labeled*) and reproducible setup instructions.
2. SQLite migrations, seeded sample campaign, schema/validation files, and import script for supplied Markdown.
3. Automated tests for domain rules, backups, migrations, and player-safe exports.
4. Device-oriented screenshots or short walkthrough verifying narrow iPhone portrait layouts; **do not claim hardware testing if only simulator used**.
5. Clear status sheet: implemented vs placeholder vs deferred vs known bug.
6. Instructions for launching on iPhone for development (e.g., compatible Expo Go or development build), and for making a distributable iOS app with signing prerequisites.
7. Import/export examples and disaster recovery procedure for a lost or replaced iPhone.

## 12. Copy/paste build prompt for Claude Code

> Build **Solmourn Companion** from `05_CLAUDE_CODE_IOS_APP_HANDOFF.md` and the other four `.md` documents in this folder. Respect the DM/private vs player-safe boundary rigorously. Prioritize a native-feeling, offline-first iPhone DM cockpit over desktop breadth. Begin by implementing **Phase 0 and Phase 1** with runnable code, seeded eight-session data, typed schema, migrations, offline storage, search, note-taking, clocks and backup/restore. Then implement the rules/party and safe export stages. Do not silently invent canon or publish spoilers. Treat all six homebrew classes and incomplete spell catalogs as playtest rules. Report gaps honestly and include tests. Keep every screen usable in portrait on a small iPhone without a laptop during play.

## 13. Open product decisions (reasonable defaults already supplied)

- **Primary stack:** Expo native iOS, with transparent installable PWA fallback if distribution impossible.
- **Cloud sync:** off by default; local-first backup to iOS Files.
- **Player access:** safe exports first; account portal later.
- **AI assistant:** opt-in later only, with per-operation confirmation and explicit private-data disclosure.
- **Multiple campaigns:** one seeded Solmourn campaign at launch, schema supports future campaigns.
- **Visual identity:** functional dark science fantasy, warm/cool contrast, no generic medieval fantasy icons.

---

**Source files to include in Claude Code workspace:**

```text
01_DM_STORY_BIBLE.md            # DM truth, private
02_PLAYER_GUIDE.md              # safe for players
03_DM_ROADMAP.md                # DM planning, private
04_FIRST_TIME_DM_FIELD_GUIDE.md # DM coaching, private
05_CLAUDE_CODE_IOS_APP_HANDOFF.md # build brief, private
```

**Definition of success:** The DM can run a Solmourn session from their iPhone, find any answer in seconds, preserve decisions and continuity, protect reveals, and recover all data from a backup—without opening a laptop during play.
