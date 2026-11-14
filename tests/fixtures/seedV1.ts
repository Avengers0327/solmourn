// DM-PRIVATE campaign seed. This file is NEVER part of the public web bundle: it is turned
// into starter-pack/solmourn-starter-pack.json (npm run pack) and imported on the DM's phone.
// Content is transcribed from the five source documents; nothing here invents new canon.
// Player-facing wording (playerMd / playerTextMd / playerSafeSummaryMd / publicInfoMd) is a
// DRAFT for the DM to edit before sharing.
import { CAMPAIGN_ID } from '../../src/domain/types';
import type {
  BackupFile, Campaign, CanonDecision, CanonRule, CanonStatus, Clock, Clue, Doc, Location, LoreEntry, MetaRecord, NPC,
  Revelation, Scene, Session, SessionEvent, TimelineEntry, Visibility,
} from '../../src/domain/types';
import type { TrialConfig } from '../../src/domain/rules';

export interface SourceDocs {
  bible: string;
  playerGuide: string;
  roadmap: string;
  fieldGuide: string;
  handoff: string;
}

const T0 = '2026-11-10T00:00:00.000Z';
const base = (id: string, sourceRef: string) => ({ id, campaignId: CAMPAIGN_ID, createdAt: T0, updatedAt: T0, revision: 1, sourceRef });
const BIBLE = '01_DM_STORY_BIBLE.md';
const GUIDE = '02_PLAYER_GUIDE.md';
const ROAD = '03_DM_ROADMAP.md';
const FIELD = '04_FIRST_TIME_DM_FIELD_GUIDE.md';

/** Body of the first section whose heading starts with `start` (up to the next heading of the same or higher level). */
export function section(md: string, start: string): string {
  const lines = md.split(/\r?\n/);
  const i = lines.findIndex((l) => /^#{1,4}\s/.test(l) && l.replace(/^#+\s+/, '').toLowerCase().startsWith(start.toLowerCase()));
  if (i < 0) return '';
  const depth = /^#+/.exec(lines[i])![0].length;
  const out: string[] = [];
  for (let j = i + 1; j < lines.length; j++) {
    const m = /^(#+)\s/.exec(lines[j]);
    if (m && m[1].length <= depth) break;
    out.push(lines[j]);
  }
  return out.join('\n').trim();
}

export function buildPack(docs: SourceDocs): BackupFile {
  // ---------- Sessions & scenes ----------
  const sessionDefs: [string, string, string][] = [
    ['The First Flicker', 'Why did the Everflame fail for seventeen minutes, and where did forty-three people go?', '17-minute Frostward blackout; 43 people missing; Mara asks for Tomas.'],
    ['Beneath the Ashes', 'Who built the strange systems beneath the city, and why are some sections sealed?', 'Buried vaults, odd field responses, evidence of old maintenance architecture.'],
    ['The Price of Daylight', "Who pays for the city's light?", 'Rationing, class inequality, Radiance overreliance and local Dissonance.'],
    ['The City Before', 'Major reveal: Solmourn is built over New York City.', 'Solmourn is atop New York City; an old northern route marked Ramapo.'],
    ['The Sevenfold Lie', "Major reveal: Solmourn is not humanity's last city.", 'Trip toward Mahwah / Ramapo Ridge; evidence of seven other cities.'],
    ['The Unbound', 'Major reveal: the First Concordance, non-innate learning, and the Sixth Canticle.', 'Ramapo relay, First Concordance records, Sixth Canticle, Vesperdeep contact.'],
    ['The Last Procession', "Who gets to choose the city's future?", 'Public unrest, Core countdown, coalition choices, controlled Concordance.'],
    ['When Darkness Comes', 'What will the world be allowed to become?', 'Repair, distribute, reverse boundary, or hybrid; consequences and epilogue.'],
  ];
  const sessions: Session[] = sessionDefs.map(([title, questionMd, pressure], i) => ({
    ...base(`ses-${i + 1}`, `${ROAD} § Session ${i + 1}`),
    index: i + 1,
    title,
    status: 'PLANNED',
    visibility: 'DM_ONLY',
    questionMd: `${questionMd}\n\n**Core reveal / pressure:** ${pressure}`,
    prepMd: section(docs.roadmap, `Session ${i + 1} —`),
    dmNotesMd: '',
    playerRecapMd: '',
    currentSceneId: i === 0 ? 'scn-1-1' : undefined,
  }));

  const sceneDefs: Record<number, [string, string, string?][]> = {
    1: [
      ['Frostward blackout', '**0:00-0:20 · Blackout and immediate response.** PCs can protect neighbors, stabilize equipment, organize shelter, or observe anomalies. Let different abilities matter. Ask each PC: "Where are you, and whom are you trying to help?"',
        'The artificial daylight flickers. For a moment everyone in the queue falls quiet. Then the light goes out altogether. Somewhere beneath the street, a pump gives a shriek like torn metal. In the dark, you hear people counting aloud—trying to believe the warmth will return.'],
      ["Mara's plea / public rumor", "**0:20-0:45.** Tomas is missing; the blackout lasted 17 minutes; the heat authority's count differs from witnesses'. Name the stakes: loss of heat, 43 missing, Mara's brother Tomas."],
      ['Investigation: Joren, site perimeter, ration office', '**0:45-1:20.** Three routes to the maintenance station (Joren, dispatch log, conduit trail). Do not roll for necessary basic directions. DCs: 10 easy, 13 standard, 15 difficult. Failure costs time/heat/access or raises ORS interest; it never deletes the station.'],
      ['Station F-17 access', '**1:20-2:05.** Dialogue with a guard, repair work, crawlspace, forged credentials, or stealth. Partial success has consequences, not dead ends. Optional conflict: 2-3 aggressive security drones or frightened civilians blocking access (reskinned low-CR stats).'],
      ['Regulator chamber and trapped spur', '**2:05-2:40.** Rescue challenge with degrading heat. Choice: rescue trapped residents first (lives secured, diagnostic data may degrade), secure evidence first (more data, emergency clock advances), or pursue a fleeing suspicious official. Permit inventive methods that achieve both at a cost.'],
      ['Consequence, Seren appears, cliffhanger', '**2:40-3:00.** Confirm worn hardware, hint of a mixed six-mode signal, new lead into buried infrastructure. End-state: at least one valid lead to older service tunnels; the blackout is a symptom of aging or management failure, not a monster attack.'],
    ],
    2: [
      ['Freezing maintenance tunnel', 'Route through a freezing maintenance tunnel with a heat-cell clock (collapsing insulation, steam, moving bulkhead).'],
      ['Cross-checking the logs', 'Old Form, Echo and Kinesis technology interfaces unexpectedly with a modern Radiance regulator.'],
      ['The salvage crew', 'A crew wants valuable components and distrusts Imperial officers. Social or tactical.'],
      ['The archived schematic', 'Recover a schematic with six linked channel symbols and redacted author records. Essential clue: an old system is designed to respond to coordinated multiple disciplines. Cost: opening a vault can draw ORS scrutiny.'],
      ['Optional: stabilizing a failing device together', 'An Emergent Concordance HINT, not a forced trigger: multiple PCs stabilize a failing device together. Describe harmonizing vibrations, not instant all-powerful magic.'],
    ],
    3: [
      ['The ration council hearing', 'Crown, Gilded and Frostward all speak; none has complete information.'],
      ['Union technicians', 'They can repair distribution but are prevented by restricted permissions.'],
      ['The energy allocation ledger', 'Investment in Crown aesthetics versus critical infrastructure.'],
      ['The overdriven junction', 'Local Dissonance near an overdriven Radiance-only transfer junction; a non-Radiance input reduces its instability. Avoid announcing that Dissonance caused the Sundering this early.'],
      ['A genuine political choice', 'Leak data, bargain with Seren, coordinate a lawful repair, or aid civil resistance. End with access to sealed historical infrastructure under the oldest parts of Solmourn.'],
    ],
    4: [
      ['The dormant transit hall', 'Set piece: dormant transit hall, frozen platform, pre-Sundering museum/survey terminal. Play the gap between the ancient bustling city and the current stratified survival state.'],
      ['The evidence accumulates', 'Old subway/interchange, map, city name, skyline archive, or municipal utility code. Provide at least two independent confirmations. Not a real-world trivia check. Give the players time to react.'],
      ['What to do with the truth', 'Preserve the evidence, disclose it, bring it to a patron, or exploit it for access. Each changes ORS scrutiny and public rumors.'],
      ['The northern lead', 'An archived northern research/education corridor points toward Ramapo / Mahwah. Give a navigation chart, approximate distance and transport constraints in world terms.'],
    ],
    5: [
      ['Permits and supplies', 'Travel clock segment 1: acquire permits/supplies. Ensure means to prepare: vehicles, thermal packs, safe stations, guides, or recovered old tunnels.'],
      ['Crossing the thermal boundary', 'Travel clock segment 2. Treat cold as an environmental challenge, not endless CON-save punishment. Complications: blizzard, energy-cell failure, ORS pursuit, scavengers, fragile bridge - each with at least two solutions.'],
      ['Lost roads', 'Travel clock segment 3: navigate lost roads, river and terrain.'],
      ['The Ramapo Ridge archive', "An ordinary old school / educational archive survived in fragments. A student project's notes record anomalies in Resonance perception among people without known innate affinity. Evidence, NOT immediate proof of the prophecy."],
      ['Not the last city', 'Other-city reveal routes: world map with eight Core records; transregional power-standard markings; preserved broadcast; recovered expedition account. End with a detectable transregional signal and a dilemma: publish, conceal, or contact a stranger first.'],
    ],
    6: [
      ['The mountain relay', 'Ancient Ramapo Mountains relay: scientific control room, patchwork pre-Sundering network, unstable Resonance field, undeciphered six-mode diagnostics. May communicate with Vesperdeep or another surviving city.'],
      ['The information ladder', '1. Original Cores manifested during simultaneous terror/despair, not designed by a government. 2. Some original participants did not have innate Attunement. 3. The six disciplines share an underlying field; Concordance may be practiced deliberately at human scale. 4. A controversial record - the Sixth Canticle - speaks of "one heart or many" becoming Unbound.'],
      ['System failure (optional trial)', 'A real life-or-death system failure with multiple possible solutions. If the party pursues connection, offer the three-stage Trial (DC 13 establish, DC 15 maintain, DC 16 resolve, damage on failed stages) or an adaptive narrative alternative. NOT a mandatory gate.'],
      ['Message from Solmourn', 'Everflame deterioration is accelerating, ORS/civil factions are moving, and return-route choices matter.'],
    ],
    7: [
      ['Return to Solmourn', 'Public procession, ration unrest, elite panic and workers\' demands converge. NPCs react based on earlier choices. Seren can be obstacle or ally; Mara and Tomas have personal priorities.'],
      ['Three competing proposals', 'Imperial emergency powers and exclusive repair access · Worker/community participation and shared infrastructure · External collaboration with other surviving cities, exposing state propaganda.'],
      ['Holding the city together', 'Get skilled workers/equipment, protect civilians from the failing heating network, negotiate passage, halt an accidental Dissonance cascade. A limited Controlled Concordance (if earned) boosts diagnostics/stabilization only.'],
      ['Counting the cost', 'Quantified needs and consequences for each finale plan (time, people at risk, materials, political coalition). Players choose their direction.'],
    ],
    8: [
      ['Recap the truth', 'Present actionable plans rather than one imposed "correct" option.'],
      ['Pay costs', 'Assemble teams, obtain infrastructure, allocate heat, reassure or confront rulers, secure people in danger.'],
      ['The decisive challenge', 'A social decision, an engineering action, and a Concordance opportunity. Every PC has a role; a caster is not required. Allies may provide missing disciplines.'],
      ['Epilogue', 'Who lives, who governs light, how other cities respond, what remains unknown. Avoid making sunrise automatically morally superior or erasing consequences.'],
    ],
  };
  const scenes: Scene[] = Object.entries(sceneDefs).flatMap(([n, defs]) =>
    defs.map(([title, descriptionMd, readAloudMd], i) => ({
      ...base(`scn-${n}-${i + 1}`, `${ROAD} § Session ${n}`),
      sessionId: `ses-${n}`,
      title,
      descriptionMd,
      readAloudMd: readAloudMd ?? '',
      sequence: i + 1,
      status: n === '1' && i === 0 ? ('ACTIVE' as const) : ('PENDING' as const),
      visibility: 'DM_ONLY' as const,
    })));

  // ---------- NPCs ----------
  const npc = (id: string, name: string, role: string, f: Partial<NPC>): NPC => ({
    ...base(id, `${BIBLE} § Local actors and NPCs`), name, role, tags: [], publicInfoMd: '', privateInfoMd: '', wants: '', fears: '',
    knowsMd: '', mistakenBeliefsMd: '', relationship: '', lastSeen: '', status: 'UNMET', visibility: 'DM_ONLY', ...f,
  });
  const npcs: NPC[] = [
    npc('npc-mara', 'Mara Venn', 'Concerned Frostward resident', {
      locationId: 'loc-frostward', tags: ['frostward', 'quest-giver'],
      publicInfoMd: 'A Frostward resident. She is asking for help finding her brother Tomas, an engineer who has been missing since the blackout.',
      privateInfoMd: 'Asks the party to locate her missing engineer brother. Wants him alive, not an ideological revolution. Wants Tomas found even if the party rejects her politics. Has personal priorities in session 7.',
      wants: 'Tomas found alive.', fears: 'That he is already dead, and that officials are hiding it.',
      knowsMd: 'Tomas is missing; the blackout lasted 17 minutes; the official count differs from what witnesses saw.',
    }),
    npc('npc-tomas', 'Tomas Venn', 'Engineer; Mara\'s brother', {
      status: 'MISSING', tags: ['engineer', 'missing'],
      publicInfoMd: "An engineer, and Mara Venn's brother. Missing since the blackout.",
      privateInfoMd: 'Engineer with knowledge of an affected maintenance station. He may have discovered malfeasance in maintenance REPORTING - without any sabotage of the Core. Where he is found is an OPEN decision; decide before session 1.',
      wants: 'To be believed about what he found in the maintenance records.', fears: 'That the failure will be buried along with the people caught in it.',
      knowsMd: 'The affected maintenance station and its reporting history.',
      mistakenBeliefsMd: "He sincerely suspects the light 'isn't dying naturally'. He is wrong: the Everflame is failing from age.",
    }),
    npc('npc-joren', 'Joren Pike', 'Caretaker / maintenance witness', {
      locationId: 'loc-frostward', tags: ['frostward', 'witness'],
      publicInfoMd: 'A caretaker and maintenance hand in Frostward who knows the service corridors and routines.',
      privateInfoMd: "Knows corridors, routines, and what the blackout sounded like. Can identify the regulator's service entrance from shifts and maintenance sounds. Backup source: can explain the wear on the machinery in an interview.",
      wants: 'To keep his people warm and stay out of official trouble.', fears: 'Being blamed for the failure.',
      knowsMd: 'The way to the Station F-17 service entrance; what the pumps sounded like when the light went out.',
    }),
    npc('npc-seren', 'Inspector Seren Vale', 'ORS-linked investigator', {
      tags: ['ors', 'imperium'],
      publicInfoMd: 'An inspector connected to the Office of Resonant Security.',
      privateInfoMd: 'Competent; neither automatically ally nor villain. Wants public order and the truth in unequal measure. Appears at the end of session 1. In session 7 can be obstacle or ally depending on earlier choices.',
      wants: 'To prevent panic.', fears: 'That unrestricted information will kill people.',
      knowsMd: 'Official blackout procedure.', mistakenBeliefsMd: 'Wrongly assumes unauthorized casters are the primary risk.',
    }),
  ];

  // ---------- Locations ----------
  const loc = (id: string, name: string, bodyMd: string, playerMd: string, visibility: Visibility, extra: Partial<Location> = {}): Location => ({
    ...base(id, `${BIBLE} § Solmourn map, society, and institutions`), name, bodyMd, playerMd, aliases: [], visibility, ...extra,
  });
  const locations: Location[] = [
    loc('loc-solmourn', 'Solmourn', '~12 million citizens, 16 km radius, six concentric socioeconomic zones around the Everflame. Stands over old New York City (LOCKED SECRET, session 4); the Everflame sits above the former Midtown area.',
      'A great city of millions, warmed and lit by the Everflame, an artificial sun. Beyond it, darkness stretches over ruins and ice. It is divided into six districts with vastly different access to resources.', 'PLAYER_SAFE', { aliases: ['Old New York', 'New York City'] }),
    loc('loc-sanctum', 'Everflame Sanctum', '0-0.7 km from center · ~20,000 residents. Core housing, secured service stacks, ancient controls.', 'Highly restricted technical and security district at the heart of the city.', 'PLAYER_SAFE', { parentLocationId: 'loc-solmourn' }),
    loc('loc-crown', 'Imperial Crown', '0.7-2.5 km · ~180,000. Government and hereditary elite; luxurious, surveilled. Residents see casting but are watched.', 'Home of officials, governing institutions and the families tied to them.', 'PLAYER_SAFE', { parentLocationId: 'loc-solmourn' }),
    loc('loc-gilded', 'Gilded Ring', '2.5-5 km · ~800,000. Licensed industry, research, costly magic permits. Licenses are expensive and geographically restricted.', 'Education, trade, formal licenses and privilege.', 'PLAYER_SAFE', { parentLocationId: 'loc-solmourn' }),
    loc('loc-wards', 'Inner Wards', '5-9 km · ~2.5 million. Dense homes, transport corridors, magitech seen as infrastructure. Personal spellcasting is nearly legendary.', 'Neighborhood networks, dense city life, transport work.', 'PLAYER_SAFE', { parentLocationId: 'loc-solmourn' }),
    loc('loc-foundries', 'Foundries', '9-13 km · ~3.5 million. Factories, thermal pumps, labor, technical knowledge. People use machines without being taught that their systems are magical.', 'Engineering, heavy labor, maintenance and industrial knowledge.', 'PLAYER_SAFE', { parentLocationId: 'loc-solmourn' }),
    loc('loc-frostward', 'Frostward', '13-16 km · ~5 million. Cold, rationing, border exposure, mutual aid, neglected repairs. The campaign opens here.', 'The cold outer district: scarcity, mutual aid, smuggling, endurance and survival.', 'PLAYER_SAFE', { parentLocationId: 'loc-solmourn' }),
    loc('loc-f17', 'Station F-17', 'Frostward maintenance station. A degraded distribution regulator and emergency containment protocol rerouted energy; the station locked down and a group of workers/residents ended up isolated in a sealed service spur. The dispatch log lists a pressure-release anomaly here.',
      'A Frostward maintenance station tied to the blackout.', 'DM_ONLY', { parentLocationId: 'loc-frostward', sourceRef: `${ROAD} § Session 1` }),
    loc('loc-ramapo-school', 'Ramapo Ridge archive', 'A fictionalized preserved educational archive (old school), NOT a magical academy, in the old Mahwah area far beyond the 16 km warmth radius. May hold a pre-Sundering student project that observed non-Attuned perception of Resonance. If skipped, move its evidence elsewhere. (WORKING)',
      '', 'DM_ONLY', { sourceRef: `${BIBLE} § Canonical campaign structure` }),
    loc('loc-ramapo-relay', 'Ramapo Mountains relay', 'Separate relay holding transregional signals: scientific control room, patchwork pre-Sundering network, unstable Resonance field. May communicate with Vesperdeep or another surviving city. (WORKING)',
      '', 'DM_ONLY', { sourceRef: `${ROAD} § Session 6` }),
    ...([
      ['Vesperdeep', 'Reykjavík', 'Participatory democracy', 'Geothermal independence; original sun/Core possibly dormant. Its relationship to the original eight Cores needs a final historical audit.'],
      ['Kharos', 'Cairo', 'Military autocracy', 'Underground thermal stores.'],
      ['Aureth', 'Paris', 'Constitutional monarchy', 'Archives and optics.'],
      ['Namaris', 'Mumbai', 'Parliamentary republic', 'Dense enclosed settlement, water reuse.'],
      ['Sevrin', 'Seoul', 'Technocratic oligarchy', 'Automated power grids.'],
      ['Orrakai', 'Tokyo', 'Federal democracy', 'Structural engineering.'],
      ['Caldris', 'São Paulo', 'Corporate oligarchy', 'Biosphere agriculture.'],
    ] as const).map(([name, area, gov, note]) =>
      loc(`loc-city-${name.toLowerCase()}`, name, `**WORKING roster - scenario proposal, not final map canon.** Historic area: ${area}. Current government idea: ${gov}. ${note}`, '', 'DM_ONLY', { sourceRef: `${BIBLE} § Other cities` })),
  ];

  // ---------- Lore ----------
  const lore = (id: string, title: string, category: string, canonStatus: CanonStatus, visibility: Visibility, bodyMd: string, src: string, playerMd = ''): LoreEntry => ({
    ...base(id, src), title, category, canonStatus, visibility, bodyMd, playerMd, tags: [],
  });
  const safeLore = (id: string, title: string, text: string, src: string): LoreEntry => lore(id, title, 'Player knowledge', 'LOCKED', 'PLAYER_SAFE', text, src, text);
  const loreEntries: LoreEntry[] = [
    lore('lore-promise', 'Campaign promise and theme', 'Overview', 'LOCKED', 'DM_ONLY',
      "In an apparently last city of humanity, the artificial sun is failing. Ordinary people investigate a blackout, learn who controls warmth, uncover the buried identity of their home, brave the world beyond its walls, and ultimately decide who gets to control the light—or whether people should need a single light at all.\n\n**Core theme:** Light is not good; darkness is not evil. Light can sustain and dominate. Darkness can kill and shelter. What is dangerous is enforced imbalance and the refusal to coexist.\n\n**The DM's hidden question:** Can a divided humanity learn to work in Concordance again, even without the original catastrophic circumstances?", `${BIBLE} § 0`),
    lore('lore-earth', 'Post-apocalyptic Earth, human-only PCs', 'Canon register', 'LOCKED', 'DM_ONLY', 'No fantasy ancestries or divine/patron cosmology.', `${BIBLE} § 1`),
    lore('lore-sundering', 'The Sundering', 'Canon register', 'LOCKED', 'DM_ONLY', "The natural sun disappeared from Earth's view about 700 years ago. The event is called **the Sundering**, always capitalized normally.", `${BIBLE} § 1`),
    lore('lore-sun-luminous', 'The sun itself remains luminous', 'Canon register', 'WORKING', 'DM_ONLY', 'A planetary Dissonance boundary interrupts normal receipt of sunlight and heat. The star itself continues burning. Fictional physics, not real cosmology; whether it impedes every type of solar radiation is open.', `${BIBLE} § 1, 2C`),
    lore('lore-nyc', 'Solmourn stands over old New York City', 'Canon register', 'LOCKED', 'DM_ONLY', 'LOCKED SECRET. Major session 4 discovery. Avoid early street-name reveals. The Everflame is above the former Midtown area.', `${BIBLE} § 1`),
    lore('lore-everflame', 'The Everflame fails from age', 'Canon register', 'LOCKED', 'DM_ONLY', "The Everflame's containment infrastructure and physical machinery are simply old. It is failing from ordinary deterioration, deferred repairs, resource shortfalls, and brittle engineering. Dissonance may add stress, but it is not a covert villain's sabotage and that explanation must never replace the aging-system truth. Investigation may uncover corruption in funding or reporting only.", `${BIBLE} § 2E, 11`),
    lore('lore-eight', 'Eight artificial suns, one instant', 'Canon register', 'LOCKED', 'DM_ONLY', 'Eight artificial suns emerged at the exact same catastrophic moment: a spontaneous Emergent Concordance driven by terror, despair, and shared survival intent in eight places. They were not invented, ritualized, or consciously summoned. Later engineering only stabilized Cores that already existed. Why precisely eight remains a historical mystery, not divine moral selection.', `${BIBLE} § 1, 2C`),
    lore('lore-elites', 'Original Concordants became ruling elites', 'Canon register', 'LOCKED', 'DM_ONLY', "The surviving original Concordants became beloved emergency stewards, then political authorities; in many cities their families became hereditary elites. Their descendants' governments have diversified over 700 years - some dynasties were overthrown, democratized, or absorbed into corporate/technical structures.", `${BIBLE} § 2D`),
    lore('lore-collective-name', 'Collective name of the eight cities', 'Canon register', 'OPEN', 'DM_ONLY', "UNDECIDED. Do not use 'Pyres' (rejected) or 'Eight Cinders' (candidate, not approved) as canon. Working term: **the Eight** / **the surviving cities** until a name is approved.", `${BIBLE} § 1`),
    lore('lore-dissonance', 'Dissonance caused the Sundering', 'Canon register', 'WORKING', 'DM_ONLY', 'A planet-scale experiment drove the six modes out of phase. Dissonance is a harmful lack of harmonic coordination - not evil, shadow, death, or a seventh element. Do not announce this cause early (session 3 shows only local Dissonance).', `${BIBLE} § 2B`),
    lore('lore-unbound', 'The Unbound: individual or collective', 'Canon register', 'LOCKED', 'DM_ONLY', 'LOCKED SECRET. A non-Attuned self-taught learner (Singular Unbound) OR a group achieving complete Unity through Concordance (Collective Unbound). Both are possible. No secret bloodline. No PC is predestined, and no single PC should eclipse the others. Unity is not conformity; coerced synchronization tends toward Dissonance.', `${BIBLE} § 1, 3, 6`),
    lore('lore-canticle', 'The Sixth Canticle (draft text)', 'Prophecy', 'WORKING', 'DM_ONLY', section(docs.bible, '6. The prophecy'), `${BIBLE} § 6`),
    lore('lore-other-cities', 'Seven other populated cities exist', 'Canon register', 'LOCKED', 'DM_ONLY', 'LOCKED SECRET. Some are free, some autocracies or oligarchies. No city is purely heroic or evil; freedom and warmth are separate axes. Reveal progressively in sessions 5-6. The roster of names and governments is WORKING (see Places).', `${BIBLE} § 1, 5`),
    lore('lore-history', 'The truth: history in DM order', 'History', 'WORKING', 'DM_ONLY', section(docs.bible, '2. The truth'), `${BIBLE} § 2`),
    lore('lore-resonance', 'Cosmology of Resonance', 'Resonance', 'LOCKED', 'DM_ONLY', section(docs.bible, '3. Cosmology of Resonance'), `${BIBLE} § 3`),
    lore('lore-institutions', 'State power, ORS and magic visibility', 'Society', 'LOCKED', 'DM_ONLY', "**Magic visibility:** Crown residents see casting but are watched; Gilded licenses are expensive and geographically restricted. Inner Wards have magitech, but personal spellcasting is nearly legendary. Foundries/Frostward use machines without being taught that their systems are magical. The **Office of Resonant Security (ORS)** surveils and detains unauthorized casters for investigation; it is not an always-executing death squad.\n\n**State power:** licenses, Anchors, education, rations, access to the Core, propaganda. **State weakness:** aging infrastructure, dependence on skilled workers, suppressed truth, inability to voluntarily coordinate all six modes.\n\nThe Solar Imperium's founding myth claims uniquely chosen Radiance-only heroes and suppresses the rest.", `${BIBLE} § 4, 2D`),
    lore('lore-finale', 'The final decision - no "correct" light', 'Finale', 'WORKING', 'DM_ONLY', section(docs.bible, '9. The final decision'), `${BIBLE} § 9`),
    lore('lore-mechanics', 'Mechanical canon and unresolved rules', 'Rules', 'PLAYTEST', 'DM_ONLY', section(docs.bible, '10. Mechanical canon'), `${BIBLE} § 10`),
    lore('lore-boundaries', 'DM-only boundaries and continuity checks', 'Canon register', 'LOCKED', 'DM_ONLY', section(docs.bible, '11. DM-only boundaries'), `${BIBLE} § 11`),
    lore('lore-missing-43', 'The missing 43 (decide before session 1)', 'Open questions', 'OPEN', 'DM_ONLY', "Their locations, causes of disappearance and fates remain scenario decisions; do not kill them off by default. **Roadmap recommendation (not yet canon):** evacuated into a sealed maintenance spur after an automated emergency lockout; some are trapped and rescueable, not all dead. Their fate must be possible to discover.", `${ROAD} § Before the first session`),
    lore('lore-prep-checklist', 'Before the first session - prep checklist', 'DM craft', 'WORKING', 'DM_ONLY', section(docs.roadmap, 'Before the first session'), `${ROAD} § Before the first session`),
    lore('lore-quick-rules', 'The fastest possible rules reference', 'DM craft', 'WORKING', 'DM_ONLY', section(docs.fieldGuide, 'The fastest possible rules reference'), `${FIELD} § The fastest possible rules reference`),
    lore('lore-session-end', 'Session-end 10-minute routine', 'DM craft', 'WORKING', 'DM_ONLY', section(docs.roadmap, 'Session-end 10-minute routine'), `${ROAD} § Session-end 10-minute routine`),
    lore('lore-first-time-problems', 'Common first-time DM problems', 'DM craft', 'WORKING', 'DM_ONLY', section(docs.fieldGuide, 'Common first-time DM problems'), `${FIELD} § Common first-time DM problems`),
    lore('lore-leveling', 'Suggested milestone leveling', 'DM craft', 'WORKING', 'DM_ONLY', section(docs.roadmap, 'Suggested milestone leveling'), `${ROAD} § Suggested milestone leveling`),
    safeLore('lore-p-welcome', 'Welcome to Solmourn', section(docs.playerGuide, 'Welcome to Solmourn').split(/\n###/)[0].trim(), `${GUIDE} § Welcome to Solmourn`),
    safeLore('lore-p-residents', 'What ordinary residents know', section(docs.playerGuide, 'What ordinary residents know'), `${GUIDE} § What ordinary residents know`),
    safeLore('lore-p-tone', 'Tone and expectations', section(docs.playerGuide, 'Tone and expectations'), `${GUIDE} § Tone and expectations`),
    safeLore('lore-p-disciplines', 'The six disciplines (public knowledge)', section(docs.playerGuide, 'The six disciplines'), `${GUIDE} § The six disciplines`),
  ];

  // ---------- Revelations & clues ----------
  const rev = (id: string, title: string, playerTitle: string, sessionIndex: number, privateTruthMd: string, playerSafeSummaryMd: string, backupMd: string, spoilerTerms: string[]): Revelation => ({
    ...base(id, `${BIBLE} § 8; ${ROAD} § Clue web`), title, playerTitle, sessionIndex, privateTruthMd, playerSafeSummaryMd, backupMd, spoilerTerms, status: 'NOT_SEEN', visibility: 'DM_ONLY',
  });
  const revelations: Revelation[] = [
    rev('rev-station', 'Station F-17 is where the blackout began', 'The maintenance station', 1,
      'A degraded distribution regulator and emergency containment protocol rerouted energy at Station F-17. The station locked down, isolating workers and residents in a sealed service spur. Imperial messaging obscures the incident to prevent panic.',
      'The blackout traces back to a Frostward maintenance station, Station F-17.', 'Failure never deletes the station: the party still gets the lead, at a cost in time, heat, access or ORS interest.', []),
    rev('rev-wear', 'The Everflame fails from wear', 'Why the light failed', 1,
      'The Everflame is failing from ordinary deterioration, deferred repairs and brittle engineering - not sabotage. Corruption in funding or reporting may exist, but nobody switched off the sun.',
      'The blackout was caused by worn-out, poorly maintained machinery - not an attack.', 'Joren or Tomas can explain the wear in an interview.', []),
    rev('rev-onefield', 'Resonance is one field (old cross-mode design)', 'The old machines answer to more than one discipline', 2,
      'The six disciplines are expressions of a single underlying Resonance field. Old systems beneath the city were designed to respond to coordinated multiple disciplines. Radiance-only overdriving produces local Dissonance.',
      'Old systems under the city were built to respond to several disciplines working together, not Radiance alone.', 'A research device visibly responds to combined inputs.', ['Dissonance', 'single underlying']),
    rev('rev-nyc', 'Solmourn = old New York City', "The city's buried name", 4,
      'Solmourn is built over New York City; the Everflame sits above the former Midtown area. Let the evidence make the revelation - never "you rolled 17, it\'s New York". Provide at least two independent confirmations.',
      'Solmourn is built on top of a far older city, once called New York.', 'Alternate sealed history vault or public art relic.', ['New York', 'NYC', 'Manhattan', 'Midtown']),
    rev('rev-north', 'A northern research corridor: Ramapo / Mahwah', 'A route north', 4,
      'An archived northern research/education corridor points toward Ramapo / Mahwah, well outside the 16 km warmth radius. The expedition needs cold survival, waypoints, heat cells, shelters and alternatives to a single route.',
      'Old records point to research and education sites far to the north, beyond the warmth of the city - at a place marked Ramapo.', 'Survivor guide, archive terminal or transport chart - any one is enough.', ['Ramapo', 'Mahwah']),
    rev('rev-cities', 'Other cities survive', 'Solmourn is not alone', 5,
      'Seven other populated cities exist (eight total with Solmourn). Some are free, some autocracies or oligarchies. Names and governments are a WORKING roster. The collective name is undecided.',
      "Solmourn is not humanity's last city. Other cities survived.", 'Incoming contact from another city after relay activation.',
      ['Vesperdeep', 'seven other cities', 'other surviving cities', 'surviving cities', 'Kharos', 'Aureth', 'Namaris', 'Sevrin', 'Orrakai', 'Caldris', 'Reykjavík']),
    rev('rev-concordance', 'The original Concordance', 'How the artificial suns truly began', 6,
      'The original Cores manifested at one shared instant during simultaneous terror and despair - involuntary, not designed by any government. Some original participants had no innate Attunement. Concordance may be practiced deliberately at human scale, far smaller than the First Concordance.',
      'The artificial suns were not built by chosen heroes. They appeared in a single desperate moment, when frightened people - not all of them Attuned - acted together.', 'Vesperdeep contact or a recorded scientist account.', ['First Concordance', 'Concordance', 'Concordant']),
    rev('rev-unbound', 'Unity / the Unbound is possible', 'The Sixth Canticle', 6,
      'The Sixth Canticle speaks of "one heart or many" becoming Unbound: an Unattuned person who learns, and/or a collective achieving Unity. No PC is predestined; the party decides whether the prophecy is trustworthy or merely politically useful.',
      'A disputed old record, the Sixth Canticle, speaks of "one heart or many, freely bound" restoring what was broken. What it means is yours to decide.', 'Vesperdeep research contact contextualizes earlier evidence.', ['Unbound', 'Sixth Canticle', 'Canticle', 'Unity']),
    rev('rev-sun', 'The natural sun still burns', 'What became of the sun', 8,
      'The sun remains luminous behind a planetary Dissonance boundary (WORKING). **No clue routes are defined in the source documents yet** - write three before this matters.',
      '', '', ['planetary boundary', 'Dissonance boundary', 'Sundering']),
  ];

  const clue = (id: string, title: string, playerTitle: string, sessionIndex: number, revelationIds: string[], privateTextMd: string, playerTextMd: string, discoveryRoutes: string[], extra: Partial<Clue> = {}): Clue => ({
    ...base(id, `${ROAD} § Clue web; ${BIBLE} § 8`), title, playerTitle, sessionIndex, revelationIds, privateTextMd, playerTextMd, discoveryRoutes,
    status: 'NOT_SEEN', required: false, evidenceItem: '', discoveredBy: [], visibility: 'DM_ONLY', ...extra,
  });
  const clues: Clue[] = [
    clue('clu-joren', 'Joren knows the service entrance', "Joren's directions", 1, ['rev-station'], "Joren Pike can identify the regulator's service entrance from shifts and maintenance sounds.", 'Joren Pike can point the way to a maintenance service entrance linked to the blackout.', ['Talk to Joren', 'No roll needed for basic directions'], { sourceSceneId: 'scn-1-3' }),
    clue('clu-dispatch', 'Official dispatch log: anomaly at Station F-17', 'The dispatch log', 1, ['rev-station'], 'The official dispatch log lists a pressure-release anomaly at Station F-17.', 'An official dispatch log records a pressure-release anomaly at Station F-17.', ['Persuasion', 'Paperwork', 'Theft', 'Access device'], { sourceSceneId: 'scn-1-3', evidenceItem: 'Dispatch log' }),
    clue('clu-conduit', 'Freezing pattern along the thermal conduits', 'The frozen conduits', 1, ['rev-station'], 'A sudden freezing pattern along thermal conduits leads toward the same subsystem.', 'A trail of sudden freezing along the thermal conduits leads toward one maintenance subsystem.', ['Follow the physical evidence'], { sourceSceneId: 'scn-1-3' }),
    clue('clu-wear-logs', 'Technician logs show long-deferred repairs', 'Technician logs', 1, ['rev-wear'], 'Technician logs document deferred repairs and degrading components.', 'Technician logs show repairs that were put off again and again.', ['Copy diagnostic data', 'Read station records'], { sourceSceneId: 'scn-1-5', evidenceItem: 'Diagnostic data' }),
    clue('clu-wear-parts', 'Worn components in the regulator chamber', 'Worn components', 1, ['rev-wear'], 'The regulator hardware is visibly worn out. Confirm at the end of session 1.', 'The regulator hardware is visibly worn out with age.', ['Inspect the regulator', 'Machinist or Strider examination'], { sourceSceneId: 'scn-1-5', required: true }),
    clue('clu-wear-tests', 'Honest third-party maintenance tests', 'Independent tests', 2, ['rev-wear'], 'An honest third-party maintenance test confirms age-related failure.', 'Independent maintenance tests confirm the machinery is failing from age.', ['Union technicians', 'Independent test rig']),
    clue('clu-mixed-signal', 'Hint of a mixed six-mode signal', 'A strange signal', 1, ['rev-onefield'], 'Diagnostics hint at a mixed six-mode signal. A hint only at this stage.', 'The diagnostics showed a strange signal with more than one kind of Resonance in it.', ['Resonant senses abnormal field', 'Pulse Scanner', 'Diagnostic data'], { sourceSceneId: 'scn-1-6' }),
    clue('clu-schematic', 'Vault schematic with six linked channel symbols', 'The vault schematic', 2, ['rev-onefield'], 'An archived schematic shows six linked channel symbols with redacted author records.', 'An old schematic shows six linked channels - and its authors\' names have been removed.', ['Open the vault (may draw ORS scrutiny)'], { sourceSceneId: 'scn-2-4', evidenceItem: 'Schematic', required: true }),
    clue('clu-technician', "A technician's memory of cross-mode machines", "A technician's story", 2, ['rev-onefield'], 'A technician remembers old machinery that needed more than Radiance to run.', 'A technician remembers old machines that needed more than Radiance to run properly.', ['Talk to the salvage crew or union technicians']),
    clue('clu-direct-test', 'Direct testing: the device responds to combined inputs', 'The experiment', 2, ['rev-onefield'], 'Direct testing shows an old device responding to coordinated inputs from multiple disciplines.', 'When tested, an old device responded to combined inputs from different disciplines.', ['Experiment on the device', 'Stabilize it together'], { sourceSceneId: 'scn-2-5' }),
    clue('clu-junction', 'A non-Radiance input calms the overdriven junction', 'The junction', 3, ['rev-onefield'], 'Local Dissonance near an overdriven Radiance-only transfer junction; a non-Radiance input reduces its instability.', 'An overdriven Radiance-only junction grew steadier when a different kind of input was added.', ['Observe the junction', 'Device behavior'], { sourceSceneId: 'scn-3-4' }),
    clue('clu-transit-map', 'Underground subway / borough map', 'The transit map', 4, ['rev-nyc'], 'An old subway/borough map in the dormant transit hall.', 'A transit map of the old city, found underground.', ['Dormant transit hall'], { sourceSceneId: 'scn-4-2', evidenceItem: 'Transit map' }),
    clue('clu-skyline', 'Archived skyline footage', 'The skyline archive', 4, ['rev-nyc'], 'Archived video of the pre-Sundering skyline at a museum/survey terminal.', 'Archived footage of the old city\'s skyline.', ['Museum / survey terminal'], { sourceSceneId: 'scn-4-2' }),
    clue('clu-inscription', 'Station equipment inscription / municipal artifact', 'The inscription', 4, ['rev-nyc'], 'A municipal utility code or equipment inscription naming the old city.', 'An inscription on old municipal equipment naming the city that came before.', ['Examine station equipment'], { sourceSceneId: 'scn-4-2' }),
    clue('clu-transport-chart', 'Transport / navigation chart to the north', 'The navigation chart', 4, ['rev-north'], 'A navigation chart with approximate distance and transport constraints toward Ramapo / Mahwah.', 'A navigation chart marking a route north to a place called Ramapo.', ['Transit hall records'], { sourceSceneId: 'scn-4-4', evidenceItem: 'Navigation chart' }),
    clue('clu-archive-terminal', 'Archive terminal lists the northern corridor', 'The archive terminal', 4, ['rev-north'], 'An archive terminal lists a northern research/education corridor.', 'An archive terminal lists research and education sites along a northern corridor.', ['Survey terminal']),
    clue('clu-survivor-guide', 'A survivor guide knows the northern road', 'The guide', 4, ['rev-north'], 'A survivor or guide knows of the old northern route.', 'Someone who has travelled beyond the perimeter knows of an old road north.', ['Frostward contacts', 'Scavengers']),
    clue('clu-school-record', 'School record: world map with eight Core records', 'The old map', 5, ['rev-cities'], 'A world map with eight Core records, in the Ramapo Ridge archive.', 'An old world map marks eight sites like the Everflame.', ['Ramapo Ridge archive'], { sourceSceneId: 'scn-5-5' }),
    clue('clu-relay-broadcast', 'Preserved transregional relay broadcast', 'The broadcast', 5, ['rev-cities'], 'A preserved broadcast / northbound relay signal from another city. Place at the mountain relay if the school is bypassed.', 'A preserved broadcast - a signal from somewhere that is not Solmourn.', ['Mountain relay', 'Recovered expedition account'], { required: true }),
    clue('clu-foreign-part', 'Foreign components with transregional markings', 'The foreign component', 5, ['rev-cities'], 'Components with transregional power-standard markings that Solmourn does not use.', 'A machine part with markings from a standard Solmourn does not use.', ['Examine salvage', 'Machinist identification']),
    clue('clu-anomaly', 'Student project: Unattuned perception of Resonance', 'The student project', 5, ['rev-unbound'], "A pre-Sundering student project's notes record anomalies in Resonance perception among people without known innate affinity. Evidence, NOT immediate proof of the prophecy.", 'Old student notes describe people with no known affinity who could nonetheless perceive Resonance.', ['Ramapo Ridge archive', 'Evacuated researcher drive', 'Relay backup'], { sourceSceneId: 'scn-5-4' }),
    clue('clu-relay-archive', 'Relay archive: First Concordance records', 'The relay archive', 6, ['rev-concordance'], 'Relay archive records of the First Concordance: simultaneous, involuntary, with non-Attuned participants.', 'The relay archive holds records of the moment the artificial suns first appeared.', ['Mountain relay control room'], { sourceSceneId: 'scn-6-2', required: true }),
    clue('clu-vesperdeep', 'Contact with Vesperdeep', 'A voice from elsewhere', 6, ['rev-concordance', 'rev-cities', 'rev-unbound'], 'A Vesperdeep (or other surviving city) contact via the relay; can contextualize earlier evidence.', 'Someone from another city answered the relay.', ['Activate the relay'], { sourceSceneId: 'scn-6-1' }),
    clue('clu-scientist', 'Recorded scientist account', "The scientist's recording", 6, ['rev-concordance'], 'A recorded account by a scientist who witnessed the stabilization era.', 'A recording by a scientist who was there in the early days.', ['Relay archive', 'Portable copy']),
    clue('clu-canticle', 'The Sixth Canticle record', 'The Sixth Canticle', 6, ['rev-unbound'], 'A credible source for the Sixth Canticle. The draft poem is in Lore.', 'A record of a disputed old verse called the Sixth Canticle.', ['Relay archive', 'Contact historian', 'Recovered manuscript fragment'], { sourceSceneId: 'scn-6-2' }),
  ];

  // ---------- Clocks ----------
  const clock = (id: string, name: string, value: number, meaningMd: string): Clock => ({
    ...base(id, `${BIBLE} § Escalation clocks`), name, value, max: 6, meaningMd, reasonHistory: [],
  });
  const clocks: Clock[] = [
    clock('clk-everflame', 'Everflame degradation', 1, 'Starts 1/6, reaches crisis near session 8, but repair efforts can slow it. Advance when the fiction warrants, not because players took too long choosing.'),
    clock('clk-ors', 'ORS scrutiny', 0, 'Starts 0/6. Increases for conspicuous unauthorized magic or intrusion; clever plans can reduce it.'),
    clock('clk-unrest', 'Public unrest', 1, 'Starts 1/6. Grows with rations and leaks; can become reform, revolt, or negotiation.'),
  ];

  // ---------- Threads ----------
  const thread = (id: string, textMd: string): SessionEvent => ({
    ...base(id, `${ROAD} § Session 1`), sessionId: 'ses-1', happenedAt: T0, kind: 'THREAD', textMd, visibility: 'DM_ONLY', linkedEntityIds: [], resolved: false,
  });
  const events: SessionEvent[] = [thread('evt-thread-tomas', 'Where is Tomas Venn?'), thread('evt-thread-43', 'What happened to the missing 43?')];

  // ---------- Timeline (world history) ----------
  const tl = (id: string, sort: number, whenLabel: string, title: string, canonStatus: CanonStatus, bodyMd: string): TimelineEntry => ({
    ...base(id, `${BIBLE} § 2`), sort, whenLabel, title, canonStatus, bodyMd, playerMd: '', visibility: 'DM_ONLY',
  });
  const timeline: TimelineEntry[] = [
    tl('tl-discovery', 2180, '~2180', 'Discovery', 'WORKING', 'Scientists find that six apparently different anomalous phenomena arise from a single underlying Resonance field. About 1 in 1,000 people are innately Attuned to one discipline.'),
    tl('tl-division', 2190, '~2190-2230', 'The Division', 'WORKING', 'States, laboratories and businesses separate Resonance into six specialized sectors. Optimization, monopolies and incompatible standards drive the modes out of phase: Dissonance.'),
    tl('tl-sundering', 2230, '~2230', 'The Sundering', 'LOCKED', "A globally linked experiment attempts synchronization at planetary scale and fails. A persistent Dissonance boundary forms around Earth. The star itself continues burning. Exact year/timestamp is an OPEN decision."),
    tl('tl-first-concordance', 2230.1, 'Same instant', 'The First Concordance', 'LOCKED', 'At one exact shared instant, eight groups at eight locations - including some non-Attuned people - involuntarily synchronize in fear, despair and the imperative to keep others alive. Eight Resonant Cores manifest simultaneously as eight artificial suns. Nobody knowingly designed or summoned one.'),
    tl('tl-stabilization', 2231, 'Following years', 'Stabilization and the dynasties', 'LOCKED', 'The Cores persist but are unstable and not infinite-energy generators. Scientists, technicians and volunteers build containment and control systems that stabilize the existing Cores. The surviving original Concordants become emergency stewards, then elites.'),
    tl('tl-myth', 2300, 'Centuries after', 'The Imperial founding myth', 'LOCKED', "The Solar Imperium rewrites history into a myth of uniquely chosen Radiance-only founding heroes, suppressing the non-Attuned survivors, collective synchronization, the other disciplines, and the seven other cities."),
    tl('tl-present', 2930, '~700 years later', 'The present day', 'LOCKED', "The Everflame's containment infrastructure and machinery are simply old and failing from ordinary deterioration. The campaign begins with a 17-minute blackout in Frostward."),
  ];

  // ---------- Canon decisions ----------
  const dec = (id: string, topic: string, status: CanonStatus, rationaleMd: string, options: string[] = [], rejected: string[] = []): CanonDecision => ({
    ...base(id, `${BIBLE} § 12. Open decision log`), topic, status, rationaleMd, options, rejected,
  });
  const canonDecisions: CanonDecision[] = [
    dec('dec-collective-name', 'Collective name for the eight surviving cities', 'OPEN', 'Approve a one-word, heat/light-inspired name. Until then use "the Eight" or "the surviving cities".', ['Cinders'], ['Pyres']),
    dec('dec-founders', 'Which founding participants were Attuned or Unattuned', 'OPEN', 'At least some Unattuned were involved in the shared Concordance.'),
    dec('dec-city-roster', 'Which other-city names and governments are canon', 'WORKING', 'The roster in Places is a scenario proposal. If reworked, retain eight simultaneous origin events.'),
    dec('dec-sundering-date', 'Exact Sundering year/UTC timestamp, or leave it mysterious', 'OPEN', ''),
    dec('dec-missing-43', 'What happened to the missing 43, and where Tomas is found', 'OPEN', 'Must be more specific before running session 1. Roadmap recommendation: evacuated into a sealed maintenance spur after an automated emergency lockout; some trapped and rescueable, not all dead.', ['Sealed maintenance spur (roadmap recommendation)']),
    dec('dec-catalogs', 'Approve discipline spell catalogs and review class balance', 'PLAYTEST', 'Resonant catalogs are incomplete. A level-3 Resonant needs ten approved legal Patterns in their one discipline.'),
    dec('dec-table', 'Party size, player preferences and session length', 'OPEN', 'Set before building combat encounters. Roadmap assumes 3-5 PCs and 2.5-3.5 hour sessions.'),
    dec('dec-canticle-keeper', 'Who preserves the Sixth Canticle and how reliable it is', 'OPEN', ''),
  ];

  // ---------- Consistency rules (data, so the rule text stays private) ----------
  const rule = (id: string, severity: CanonRule['severity'], pattern: string, message: string, suggestion: string, extra: Partial<CanonRule> = {}): CanonRule => ({
    id, campaignId: CAMPAIGN_ID, severity, pattern, flags: 'i', message, suggestion, exemptIds: [], negationAware: true, ...extra,
  });
  const nameExempt = ['dec-collective-name', 'lore-collective-name', 'lore-boundaries'];
  const canonRules: CanonRule[] = [
    rule('rule-sundering', 'error', 'sundering', 'The catastrophe is written "the Sundering" - normal capitalization.', 'Replace with "Sundering".', { mustEqual: 'Sundering', negationAware: false }),
    rule('rule-pyres', 'error', '\\bPyres\\b', '"Pyres" was rejected as the collective name for the cities.', 'Use "the Eight" or "the surviving cities".', { exemptIds: nameExempt }),
    rule('rule-cinders', 'warning', '\\b(Eight )?Cinders\\b', '"Cinders" is only a candidate name; it has not been approved.', 'Use "the Eight" or "the surviving cities" until a name is approved.', { exemptIds: nameExempt }),
    rule('rule-sun-count', 'warning', '\\b(two|three|four|five|six|seven|nine|ten|(?!8\\b)\\d+)\\s+(artificial\\s+)?(suns|Cores)\\b', 'Exactly eight artificial suns (Cores) manifested.', 'Check the count: eight, simultaneously.', { negationAware: false }),
    rule('rule-sabotage', 'warning', 'sabotag', 'The Everflame fails from aging machinery, not sabotage.', 'Keep sabotage as an NPC\'s mistaken belief at most; corruption may exist in funding/reporting only.'),
    rule('rule-sun-destroyed', 'warning', '\\bsun\\b[^.]{0,40}\\b(destroyed|died|dead|extinguished|burned out)\\b', 'The natural sun was not destroyed; it remains luminous behind the boundary.', 'Describe it as hidden or cut off, not destroyed.'),
    rule('rule-cores-invented', 'warning', '\\b(invented|designed|engineered|summoned|built|created)\\b[^.]{0,30}\\b(artificial suns|suns|Cores)\\b', 'The Cores manifested involuntarily in the First Concordance; engineering only stabilized them afterward.', 'Say the systems stabilize existing Cores.'),
    rule('rule-all-autocracies', 'warning', '\\b(all|every)\\b[^.]{0,30}\\b(cit(y|ies)|governments?)\\b[^.]{0,30}\\b(autocrac|monarch|dynast|tyrann)', 'Founders became elites, but modern governments are diverse.', 'Avoid implying every city is an autocracy.'),
    rule('rule-dark-evil', 'warning', '\\b(darkness|the dark|the night)\\b[^.]{0,20}\\b(is|are) evil\\b|purge the night', 'Light is not good and darkness is not evil.', 'Reframe: the danger is enforced imbalance.'),
    rule('rule-chosen', 'warning', '\\b(chosen one|predestined|destined to|chosen at birth)\\b', 'No PC is predestined or secretly chosen.', 'Keep the prophecy open to the party\'s interpretation.'),
  ];

  // ---------- Group technique config ----------
  const trialConfig: TrialConfig = {
    emergentLabel: 'Emergent Concordance',
    controlledLabel: 'Controlled Concordance',
    emergentStages: [{ name: 'Establish', dc: 13 }, { name: 'Hold', dc: 15 }, { name: 'Resolve', dc: 16 }],
    controlled: { minParticipants: 2, minSources: 2, leadDc: 15, rpPerCaster: 2, usesPerLongRest: 1, durationNote: 'Concentration, up to 1 minute' },
    effects: ['Shield a corridor or small area', 'Stabilize a failing device', 'Boost diagnostics', 'Steady a local instability'],
    forbiddenPattern: 'ninth sun|new sun|another sun|create a sun|make a sun|restore the (natural )?sun|sunlight|planet|boundary|whole city|entire city',
    forbiddenMessage: 'Out of scale: a Controlled Concordance cannot create a sun, restore sunlight or solve planetary restoration. Pick a small bounded effect.',
    dmNote: 'Emergent trials need a real crisis and are never a mandatory gate (damage on failed stages; DM may override). Record what happened without declaring anyone\'s destiny, and do not suggest Unbound outcomes to players before the reveal. The First Concordance cannot be duplicated by these rules.',
  };
  const meta: MetaRecord[] = [{ key: 'trialConfig', value: trialConfig }];

  // ---------- Documents ----------
  const doc = (n: string, title: string, fileName: string, bodyMd: string, visibility: Visibility): Doc => ({ ...base(`doc-${n}`, fileName), title, fileName, bodyMd, visibility });
  const docsOut: Doc[] = [
    doc('01', 'DM Story Bible', BIBLE, docs.bible, 'DM_ONLY'),
    doc('02', 'Player Guide', GUIDE, docs.playerGuide, 'PLAYER_SAFE'),
    doc('03', 'Eight-Session DM Roadmap', ROAD, docs.roadmap, 'DM_ONLY'),
    doc('04', 'First-Time DM Field Guide', FIELD, docs.fieldGuide, 'DM_ONLY'),
    doc('05', 'App build brief', '05_CLAUDE_CODE_IOS_APP_HANDOFF.md', docs.handoff, 'DM_ONLY'),
  ];

  const campaign: Campaign = { ...base(CAMPAIGN_ID, 'starter pack'), title: 'Solmourn: The Dying Light', edition: '5e-2014', currentSessionId: 'ses-1', settings: {} };

  const tables: BackupFile['tables'] = {
    campaigns: [campaign], sessions, scenes, npcs, locations, lore: loreEntries, revelations, clues, clocks, events,
    pcs: [], canonDecisions, timeline, audit: [], docs: docsOut, encounters: [], trials: [], canonRules, meta,
  };
  const counts = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, (v as unknown[]).length]));
  return { manifest: { app: 'solmourn-companion', kind: 'starter-pack', formatVersion: 1, schemaVersion: 1, exportedAt: T0, counts }, tables };
}
