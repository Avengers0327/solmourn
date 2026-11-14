# Solmourn Companion

An offline, phone-first DM cockpit for **Solmourn: The Dying Light**, a 15-session branching campaign. Version 0.5 (canon seed v4).

> **What this is, plainly:** an installable web app (PWA), not a native iOS app. You add it to your iPhone Home Screen from Safari; it then opens full-screen and works with no connection.

Canon authority: [content/SOLMOURN_CANONICAL_DM_STORY_BIBLE.md](content/SOLMOURN_CANONICAL_DM_STORY_BIBLE.md), as amended by [content/01_DIVERGENCE_CANON_AMENDMENT.md](content/01_DIVERGENCE_CANON_AMENDMENT.md) (any official species; nothing else changes). Lore entries in the app are extracted verbatim from that file, section by section, with its LOCKED / WORKING / OPEN labels. Everything else in the app (session prep, clues, branches, stat cards, Academy lessons, spell mapping) is WORKING or PLAYTEST material written for you to edit.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app at http://localhost:5173 |
| `npm test` | 199 automated tests (sync, shared passphrase and the ChatGPT feed included): canon checklist, spoiler safety, seed upgrades, rules, spells, species, passphrase, character creation |
| `npm run build` | Type-checks, builds `dist/`, and fails if spoilers appear outside the DM chunk |
| `npm run docs` | Regenerates the Markdown in `docs/` from the same records the app seeds |
| `npm run spells -- <file>` | Rebuilds the SRD spell text from a raw SRD dump |
| `node scripts/build-spell-index.mjs <srd.json> <index-meta.json>` | Rebuilds the deduplicated spell metadata inventory (see "Spell directory") |
| `npx tsx scripts/spell-audit.ts` | Prints the spell totals, per-book coverage and any mapping name that matched nothing |
| `node scripts/build-species.mjs <dir>` | Rebuilds the SRD species data from raw SRD records |

## The campaign is preloaded

There is no import step. On first launch the app seeds the whole campaign and opens at Session 1, unstarted. This works offline because the seed ships inside the app.

**Privacy consequence you should know about.** Because the DM-only campaign now ships with the app, anyone who can open the hosted URL could extract the secrets from the code (it sits in a separate `seed-*.js` chunk, but it is downloadable). Presenter mode, exports and search still never show DM content. So:

- Host it somewhere only you know the address of, and never give players the URL. The page is marked `noindex`.
- Give players the generated `docs/CHARACTER_CREATION_GUIDE.md` and `docs/SPELL_DIRECTORY.md`, or use Presenter mode on your own phone.
- Do not put this repository, `content/`, `src/seed/` or the `docs/DM_*.md` files anywhere public.

## Spell directory

Library → Resonance Pattern directory lists **578 entries**: the deduplicated 2014-era spell inventory mapped to the six disciplines, plus 12 original Solmourn Patterns. It is bundled static data and works offline.

**What "verified" means here (read this):**

| Tier | Count | What was checked |
|---|---:|---|
| SRD verified | 319 | Official SRD 5.1 text and metadata, cross-checked against a second, independent index. 3 disagreements are recorded on the cards (Revivify, Mass Cure Wounds, Mass Heal: the sources disagree on the school). |
| Unverified | 205 | Official 2014-era spells outside the SRD. **Metadata only** (level, school, casting time, range, duration, component letters, which books print it) from **one third-party index** (dnd5e.wikidot.com), **not checked against any official book**. No rules text; page numbers are not recorded. The card points to the book. |
| Original | 12 | Written for this campaign (PLAYTEST). |
| Unearthed Arcana | 42 | Playtest, not published: listed and excluded, hidden from players. |

Per-book totals (a spell printed in two books is one row, counted under each): PHB 361 (319 verified, 42 unverified), XGE 95, TCE 21, EGW 15, AI 7, FTD 7, SCC 5, LLK 3, BMT 3, IDRF 2, AAG 2, PAM 2, GGR 1; EEPC 3 and SCAG 1 only where the index credits them. They look consistent with the printed books as far as I can tell, but that was not checked. Books that print no new player spells (Mordenkainen, Volo, Van Richten, Eberron, Theros, most adventure books) are not listed.

**Mapping.** Each spell has a discipline and a one-line reason. 23 mappings are flagged as judgement calls with a longer note; 92 official spells are excluded with reasons (gods, summoning, other planes, undead and resurrection, curses and wishes). All of this is a WORKING proposal awaiting your approval. A Resonant keeps the single-discipline rule and RP costs 0/2/3/5/6/7/9/10/11/13.

**Using it:** search by Pattern or published name; filter by discipline, level, school, sourcebook, verification and availability; pick a Resonant to filter to what they can legally add, what is in the book, and what is prepared (and add or prepare from the card); star favorites (kept on this device, included in backups). Players see no Unearthed Arcana and no DM-only Patterns.

**Your characters' Pattern selections are never removed.** Ids no longer include the discipline, so remapping a spell cannot orphan a selection. Old ids are renamed in place on launch (idempotent, logged in Change history); an id the directory does not know is kept and shown as such.

## DM passphrase

There is no default passphrase. Until you set one (Library → Settings, or the banner on the Now tab), anyone holding the phone can open the DM view.

- **Asked for:** when the app opens, when leaving Presenter mode, after 5 minutes in the background, and before backup, restore, reset, or changing or removing the passphrase. The 🔒 button locks the DM view at once.
- **Player view needs no passphrase:** the lock screen offers "Open player view instead", which is Presenter mode.
- **Storage:** the passphrase (8+ characters) is never stored or sent as typed. Each device keeps a salted PBKDF2 hash in local storage (so it can unlock offline). On the deployed site the server keeps only a SHA-256 of a PBKDF2-stretched key, and limits wrong guesses to 10 per 15 minutes. It is never in backups, exports, search or player screens.
- **Forgot it:** use the one-time recovery code shown when you set it (on the deployed site, see "Forgot the passphrase" above). Without a server, if the code is lost too, "Erase and reset" clears the device; then restore your latest backup.
- **Old installs:** an old 4-digit passcode is accepted once, then must be replaced with a passphrase.

**What it does not do:** it is a lock on the app, not encryption. The campaign data in the browser's storage and in backup files is not encrypted, and the DM content is still downloadable from the hosted site (see above).

## Species (the Divergence)

Any official D&D species may be played (Canon Amendment 001). The builder offers three tiers:

- **Rules built in (10):** the nine SRD 5.1 species (human, dragonborn, hill dwarf, high elf, rock gnome, half-elf, half-orc, lightfoot halfling, tiefling) plus the PHB 2014 variant human. Ability bonuses, size, speed, darkvision, resistances, choices and innate features are automated.
- **From your book (78 entries + "another official species"):** other official 2014-era species. **This list was compiled from memory and is not verified.** The player enters the traits from their own copy of the book with book and page, and the character is flagged in Consistency checks until you mark it DM-approved. No rulebook text is stored.
- **2024 revisions (10):** listed but not selectable. The baseline is 2014, and adopting 2024 species is an OPEN decision; this also prevents stacking 2014 species bonuses with 2024 background bonuses.

One species rules package per character; mixed heritage is a description only. Species innate features (breath weapon, infernal legacy, hand-entered ones) are their own limited-use resources and never use or grant Resonance Points, Patterns or Amplification. Characters created before the amendment are read as human and stay valid unchanged.

## Deploying (Cloudflare): one site, one passphrase, every device

Deployed on Cloudflare Workers, the app syncs: your phone, your PC, the Home Screen app and a browser tab all show **the same campaign** and use **the same passphrase**. `wrangler.jsonc` holds the settings.

**Cloudflare settings (Workers → solmourn → Settings → Build):** build command `npm run build`, deploy command `npx wrangler deploy`. Pushing to GitHub redeploys. Nothing else to configure.

**First time:**
1. Open the site on any device (phone: in **Safari** → Share → **Add to Home Screen**).
2. Library → Settings → set the DM passphrase and save the recovery code. That passphrase now unlocks every device. (If a device already had its own passphrase, the first one to unlock online becomes the shared one.)
3. On each other device, open the site and unlock with the same passphrase: it downloads the campaign.
4. **Verify offline before session 1:** Airplane Mode on, force-quit, reopen, add a note, advance a clock, roll dice. Changes upload when the phone is back online.

**How sync behaves:** changes upload a few seconds after you make them; the app downloads the latest when it opens, comes back to the front, comes back online, and every minute while open. If two devices both change things before syncing, the later upload wins and the other device's version is kept in Library → Settings → Saved copies (save it as a file and restore it if needed). Nothing is merged field by field.

**Changing the passphrase** on one device signs the others out; they unlock with the new one next time they are online. A device that is offline keeps accepting the passphrase it last saw until it reconnects.

**Forgot the passphrase:** "Forgot the passphrase?" on the lock screen with your recovery code. Lost that too: in Cloudflare add a **Secret** named `RESET_PASSPHRASE` (any value), then on the lock screen → Forgot → "Lost the recovery code too?" enter that value. This clears the passphrase only; the campaign is kept.

**Local preview** (`npm run dev` / `npm run preview`) has no server, so it does not sync and keeps a separate copy on that computer. `npx wrangler dev` runs the full site, sync included, locally.

## ChatGPT (read-only DM link)

Library → Settings → **Read-only link for ChatGPT** gives a private link like `https://…/api/dm/<key>`. Paste it into a ChatGPT chat and ask it to open it. It serves the full DM view as plain-text pages: an index, "where the campaign stands", each session (prep, scenes, read-alouds, choices, clues, table notes), mysteries, people, places, world and canon, party, table log, stat cards and lessons, and the source documents. It shows the state as of the last sync and cannot change anything.

Anyone with the link can read every spoiler: don't share it with players. **Make a new link** switches the old one off. The pages carry `noindex`, so search engines are told not to list them. Whether ChatGPT can open a given link depends on ChatGPT's own browsing; I could not test that from here.

## Upgrades never overwrite your campaign

When a new seed version ships (or you restore an old backup), the app updates in one all-or-nothing step:

- records you never edited are updated in place;
- play state is never touched: session status and notes, clock values, reveals, NPC status, choices, lesson progress, characters;
- sessions you have already played, and clues or revelations already found, are frozen as history;
- a record whose text you edited is kept, and the new canon version appears as a **collision** in Library → Canon upgrade report (*Keep mine / Use new / Add as draft*);
- superseded seed records you never touched are retired; ones you edited or played are kept and listed as legacy.

To change the campaign content: edit `src/seed/*.ts` (or the bible), bump `SEED_VERSION` in `src/seedVersion.ts`, rebuild and redeploy.

## Backups and a lost or replaced phone

- Library → Backup & restore → **Export full backup** → *Save to Files*. Do this after every session. The file is named `solmourn-DM-ONLY-backup-…` and contains every secret.
- New phone: on the deployed site just open it and unlock: sync downloads everything. Without sync: install, then Library → Backup & restore → choose the backup → **Replace everything with this file**.
- Forgot the passcode: the lock screen offers "Erase and reset"; then restore a backup.

## How spoiler safety is enforced

- Every record keeps DM text and player-approved text in separate fields, plus a visibility (`DM_ONLY`, `PLAYER_SAFE`, `REVEALED`) that is independent of canon status. New records default to DM-only.
- Everything a player can see goes through `src/domain/safe.ts`, an allowlist of named player fields. Revealing a clue shares its player-safe line only, never its private note or the truths it links to.
- Presenter mode (📺) renders and searches only that projection, survives a reload, and needs the passcode to leave.
- Exports always preview first; a scanner flags words tied to revelations the party has not reached.
- No accounts, analytics, notifications, network calls or AI services.

## What is in the app

- **Now:** cockpit with scenes and read-alouds, three core clocks with undo, quick notes, safety pause, two-tap "mark clue found", Choices, campaign State, stat cards, and `?` buttons that open the matching DM Academy lesson.
- **World:** the bible as searchable entries, six rings, nine Embers, NPCs, factions, timeline, at-table history.
- **Party:** level-3 creation walkthrough with validation, sheets, class resources, rests, Patternbook, overcasting calculator.
- **Mysteries:** 11 revelations (truth, prevailing belief, who knows, earliest reveal, backup, approved summary) with 38 clues; threads; experiment tracker.
- **Library:** search, documents, rules, the Pattern directory, DM Academy, canon decisions, consistency checks (18 rules from the bible's checklist), canon upgrade report, player exports, backup.

## Generated Markdown (`docs/`)

| File | Audience |
|---|---|
| `DM_CAMPAIGN_15_SESSIONS.md` | DM: prep cards, scenes, choices, clues, mysteries |
| `DM_ACADEMY.md` | DM: 15 lessons with rehearsal exercises |
| `DM_STAT_CARDS.md` | DM: 21 PLAYTEST adversary and hazard cards |
| `DM_CONFLICT_LEDGER.md` | DM: superseded facts, open questions, newly authored material |
| `CHARACTER_CREATION_GUIDE.md` | Players |
| `SPELL_DIRECTORY.md` | Players |

## Status

**Verified here:** 199 automated tests; production build and bundle check; manual passes in a desktop browser at 375×812. The passes covered fresh preload, the new screens, character creation (including a dragonborn and a hand-entered plasmoid), Presenter mode and its search, reload persistence, a single seed run, and the full passphrase cycle (set, wrong entry, unlock, recovery code, gated backup, Presenter exit, legacy-passcode upgrade).

**Not verified:** nothing has been run on a physical iPhone; the passphrase screens and Face ID-free lock have only been exercised in a desktop browser. Installed-PWA offline behaviour and the iOS share sheet are untested on hardware. The upgrade of an old eight-session install is covered by automated tests against a simulated database, not by a real upgraded device.

**Incomplete or placeholder:**
- 205 official spells outside the SRD are **unverified** (see Spell directory) and have no rules text. EEPC and SCAG attributions are only where the index credits them.
- The discipline mapping, 92 official exclusions, 20 renames and 12 original Patterns are proposals awaiting your approval.
- The app has a text site layout for Exchange 17 but no drawn maps.
- All session prep, clues, branches and stat cards are drafts and have not been playtested or balance-checked.
- Class rules come from `02_PLAYER_GUIDE.md` v1.0; the "latest class guide" the bible mentions was not supplied.
- Hit Dice are not tracked. No PDF export, portraits, cloud sync, native build or Face ID.
- Species outside the SRD have no automated traits, and their list is unverified. Species-specific accommodations (equipment sizing, aquatic needs) are prompts in the DM Academy, not rules.
- NPC species is a free-text field, OPEN unless you fill it in. There is no NPC generator.

**Resolved by your decisions** (Library → Canon decisions): "the Sundering" is the public name; the opening location is Frostward Thermal Exchange 17 (not the retired Station F-17); exactly seven maintenance workers disappear (four trapped, two detained by Imperial security, Ilan Rook missing deeper inside, with his fate not predetermined); Mara Venn follows the bible; the legacy names are retired.

**Still OPEN:** the other six workers' names, species and condition, and where the two are held; which species sourcebooks the table uses and whether to adopt 2024 species; everything in bible §17.


## Attribution

Spell and species data: this work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License (https://creativecommons.org/licenses/by/4.0/legalcode). Spell data was retrieved from the open 5e SRD API.
