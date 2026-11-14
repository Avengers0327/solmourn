// World records. LOCKED facts cite the bible section they come from; anything the bible lists as
// a proposal, and anything authored here for playability, is WORKING. Nothing here promotes status.
import { CAMPAIGN_ID } from '../domain/types';
import type { CanonDecision, CanonRule, CanonStatus, Clock, Location, LoreEntry, NPC, TimelineEntry, Visibility } from '../domain/types';
import type { TrialConfig } from '../domain/rules';
import { AUTHORED, LEGACY, OWNER, base, bib } from './helpers';

// ---------------- Locations ----------------
const loc = (id: string, name: string, src: string, status: CanonStatus, visibility: Visibility, bodyMd: string, playerMd = '', extra: Partial<Location> = {}): Location => ({
  ...base(id, src, status), name, bodyMd, playerMd, aliases: [], visibility, ...extra,
});
const ring = (id: string, name: string, radius: string, pop: string, body: string, playable: string, playerMd: string) =>
  loc(id, name, bib('3.2'), 'LOCKED', 'PLAYER_SAFE',
    `**Radius from the Everflame:** ${radius} · **Population:** ${pop} *(LOCKED, §3.2)*\n\n${body}\n\n**At the table (WORKING playability notes):**\n${playable}`, playerMd, { parentLocationId: 'loc-solmourn' });

export const locations: Location[] = [
  loc('loc-solmourn', 'Solmourn', bib('3.1'), 'LOCKED', 'PLAYER_SAFE',
    'Megacity of **54,000,000** in six administrative and thermal-distance rings (not geometrically perfect), reaching roughly **55 km** at its outermost inhabited extent. Built upon and through the ruins of **New York City**; the Everflame hangs above former **Midtown Manhattan**; the outer city reaches the **Mahwah/Ramapo, New Jersey** region. The old identity is DM-only until the sessions 8-9 archive. Foreshadow only through fragments: partial rail and park signage, old map overlays.',
    'A megacity of 54 million people, built in six rings around the Everflame, the artificial sun that keeps it alive. Beyond the heated city lie the Wastes.',
    { aliases: ['New York City', 'New York', 'Manhattan'] }),
  ring('loc-sanctum', 'Sanctum', '0-0.7 km', '8,000', 'Sacred and technical Everflame Core, the Basilica, restricted personnel, pilgrimage access. Not a normal residential zone.',
    '- **Heat:** total redundancy. **Work:** Core technicians, Keepers, Sanctum Guard.\n- **Entrances:** the pilgrimage causeway (public, screened); Stewardship service lifts (credentialed); sealed pre-isolation maintenance ways (unknown to most).\n- **Links:** Crown ministries, the Great Basilica, Core machinery.',
    'The restricted heart of the city beneath the Everflame: the Great Basilica, the Core works and their guards. Pilgrims may enter by the causeway.'),
  ring('loc-crown', 'Crown', '0.7-2.5 km', '392,000', 'Palace, dynasty, ministries, high nobility, redundancy and privilege.',
    '- **Heat:** prioritized, redundant loops. **Food:** best reserves. **Transport:** private lifts, guarded trunk stations.\n- **Prejudice:** outer-ring accents and papers draw attention. **Work:** ministries, Ascendant households, service staff commuting in.\n- **Entrances:** ministry checkpoints; service corridors used by commuting staff; ceremonial routes on Vigil holidays.',
    'The seat of the Empress, the ministries and the high nobility. Warm, guarded, and closely watched.'),
  ring('loc-gilded', 'Gilded Ring', '2.5-5 km', '1,600,000', 'Wealth, academies, licensed Resonance, high-service housing.',
    '- **Heat:** reliable. **Work:** academies, licensed Resonant practices, finance, research.\n- **Prejudice:** polite, procedural; licenses and schools open doors. **Entrances:** academy visitor passes, trade credentials, clinic referrals.',
    'Wealth, academies and licensed Resonance. Where the city trains the people it trusts.'),
  ring('loc-wards', 'Inner Wards', '5-12 km', '7,000,000', 'Dense mixed commerce, schools, hospitals, working and middle-class neighborhoods.',
    '- **Heat:** mostly steady, brownouts noticed and resented. **Work:** hospitals, markets, schools, transit.\n- **Transport:** district metro hub between inner and outer city. **Entrances:** open; checkpoints tighten when ORS scrutiny rises.',
    'Dense neighborhoods of shops, schools and hospitals: the busy middle of the city.'),
  ring('loc-foundries', 'Foundries', '12-25 km', '15,000,000', 'Factories, industrial housing, constructs, freight and maintenance.',
    '- **Heat:** industrial waste heat helps; maintenance backlogs are visible. **Work:** fabrication, recycling, freight rail, thermal maintenance.\n- **Hazards:** steam, moving machinery, malfunctioning constructs. **Entrances:** shift gates, freight yards, service tunnels.\n- **Links:** thermal capture and exchanger stations; Cinder support (DM-only).',
    'Factories, freight and industrial housing. The people who keep the machines running live here.'),
  ring('loc-frostward', 'Frostward', '25-55 km', '30,000,000', '**Extremely dense outer-city tenements**, community networks, unreliable heating. Frostward is a crowded urban ring with high-rises, transit, shops and neighborhoods. It is NOT the Wastes. Residents are not interchangeable victims: families, businesses, pride, loyalties, political disagreement, mutual aid.',
    '- **Heat:** the end of long heat arteries; first to lose pressure. **Food:** ration guarantees plus informal markets.\n- **Transport:** crowded district metro, lifts, skyways; ring checkpoints inbound. **Prejudice:** institutional (allocation, licensing, justice) plus social.\n- **Entrances:** everywhere - 30 million people live here. **Links:** Frostward Thermal Exchange 17, the Mahwah/Ramapo archive at the far edge.',
    'The outer ring, home to thirty million people in dense tenements and tight communities. Its heat is the least reliable in the city. The campaign opens here.'),
  loc('loc-wastes', 'The Wastes', bib('2.4'), 'LOCKED', 'PLAYER_SAFE', 'Open-air territory beyond functioning thermal protection: largely barren and lethally cold. Do not populate by default with thriving villages, monster hordes or ordinary wilderness ecosystems. Frostward ends where the heat grid ends; the Wastes begin there.',
    'Everything beyond the reach of the heat grid. Lethally cold. People do not live there.'),
  loc('loc-basilica', 'Great Basilica', bib('7.3'), 'LOCKED', 'PLAYER_SAFE', 'Principal seat of the Vigil of the First Light, in the Sanctum. The nine-rayed golden disk is everywhere here; nobody present understands its original meaning.', 'The great church of the Vigil of the First Light, beneath the Everflame.', { parentLocationId: 'loc-sanctum' }),
  loc('loc-hall-first-light', 'Hall of First Light', bib('7.3'), 'LOCKED', 'DM_ONLY', 'Sanctum institution that may contain archives. It does **not** hold a convenient Concordance manual or a living keeper of the secret.', '', { parentLocationId: 'loc-sanctum' }),
  loc('loc-chamber-vigil', 'Chamber of Vigil', bib('7.3'), 'LOCKED', 'DM_ONLY', 'Sanctum institution near the Core machinery and guarded restricted zones.', '', { parentLocationId: 'loc-sanctum' }),
  loc('loc-f17', 'Station F-17 (retired legacy name)', LEGACY, 'RETIRED', 'DM_ONLY', '**RETIRED** (owner decision 2026-11-13; bible §12.2). Kept as a historical record only. It is **not** Frostward Thermal Exchange 17: do not merge their histories, characters, maps or story content because both use the number 17.', '', { parentLocationId: 'loc-frostward' }),
  loc('loc-opening-station', 'Frostward Thermal Exchange 17', OWNER, 'LOCKED', 'DM_ONLY', `**Exchange 17.** An aging thermal distribution and maintenance facility serving Frostward neighbourhoods. The opening location of the campaign. **LOCKED (owner decision 2026-11-13).** It is not the retired Station F-17. It contains no Old World signage and nothing that hints at the city's former identity.

**The seven (LOCKED):** exactly seven maintenance workers disappear in the opening blackout. **Four** are trapped in the collapsed lower service gallery and can potentially be rescued. **Two** are detained by Imperial security after encountering suppressed maintenance reports. **One, Ilan Rook,** disappears deeper inside the exchange; his final fate is not predetermined. The party need not rescue everyone or find every clue.

**Site layout (WORKING prep; there is no drawn map in the app):**
\`\`\`
Street level   service door, constable cordon point, loading bay
Level 1        regulator hall (the failing regulator); control gantry above
Level 1 east   flooded pump gallery
Level 2        maintenance offices, lockers, badge reader, plan board, night-shift sign-in board
Level 3        COLLAPSED lower service gallery: the four trapped workers
Level 3 down   service ladders to deeper machinery levels: Ilan Rook was last seen here
Beside         tenement boiler-room crawlway into Level 2
\`\`\`

**Ways in (WORKING):** the street service door (cordon and drones); the boiler-room crawlway; the flooded pump gallery from the canal side.`, 'Frostward Thermal Exchange 17 ("Exchange 17"): an aging thermal distribution and maintenance facility serving Frostward neighbourhoods.', { parentLocationId: 'loc-frostward' }),
  loc('loc-underways', 'The Underways', 'Worldbuilding conversation (proposal; not in the bible)', 'WORKING', 'DM_ONLY', '**WORKING proposal.** Buried transit lines, maintenance passages, utility corridors and sealed pre-Sundering facilities under the city. Some Imperial-controlled, some held by opportunists, many unentered for centuries. Useful as exploration sites and as the place old signage fragments survive.', ''),
  loc('loc-archive', 'Mahwah/Ramapo archive', bib('10.2'), 'LOCKED', 'DM_ONLY', 'Buried historical archive beneath the **densely inhabited** outer city in the Mahwah/Ramapo region (sessions 7-9). Holds the ~10 AS survey map: the **nine Embers** and pre-Sundering geography, including the New York identity. The map is history: it does **not** show whether any foreign Ember survives today, and says nothing about how Concordance works.\n\n**Entrances (WORKING):** tenement sub-basement breach; sealed municipal stair found via a survey marker; an Imperial salvage shaft.', '', { parentLocationId: 'loc-frostward' }),
  loc('loc-relay-workshop', 'Cinder workshop (Old Relay)', bib('9.2'), 'LOCKED', 'DM_ONLY', 'A Cinder Foundries workshop that reuses components of the **Old Relay** (working name; also "Relay Nine") for local encrypted communications. Long-range capability is dormant; documentation fragmentary. The Cinders do not know what it was for. It is not a Concordance device, not a readable map, and holds no explanation of the natural sun.', '', { parentLocationId: 'loc-foundries' }),
  ...([
    ['vesperdeep', 'Vesperdeep', 'Reykjavík, Iceland', 'Technocratic federation', 'Geothermal redundancy and deep-earth engineering'],
    ['kharos', 'Kharos', 'Cairo, Egypt', 'Military dictatorship', 'Fortification, military logistics, managed water and agriculture'],
    ['aureth', 'Aureth', 'Paris, France', 'Scholarly republic', 'Archives, research, precision engineering'],
    ['namaris', 'Namaris', 'Mumbai, India', 'Mercantile federation', 'Manufacturing, recycling, logistics, guild/cooperative bargaining'],
    ['sevrin', 'Sevrin', 'Seoul, South Korea', 'Technocratic civic state', 'Robotics, autonomous maintenance, algorithm-assisted planning'],
    ['orrakai', 'Orrakai', 'Tokyo, Japan', 'Arcology-based civic federation', 'Vertical urbanism, integrated infrastructure, local councils'],
    ['caldris', 'Caldris', 'São Paulo, Brazil', 'Ecological commonwealth', 'Biotechnology, closed-loop agriculture, regenerative systems'],
    ['azmara', 'Azmara', 'Lagos, Nigeria', 'Decentralized district federation', 'Modular infrastructure, local adaptation, distributed systems'],
  ] as const).map(([id, name, geo, gov, orient]) =>
    loc(`loc-ember-${id}`, name, bib('2.1'), 'LOCKED', 'DM_ONLY',
      `One of the **nine Embers** (original artificial-sun cities).\n\n- **Former geography:** ${geo}\n- **Government identity:** ${gov}\n- **Distinctive orientation:** ${orient}\n\n**OPEN:** exact institutions, current incumbents, internal factions, and whether it still functions at 700 AS. Nobody in present-day Solmourn knows it exists.${id === 'aureth' ? '\n\nA tiny circle of Aureth researchers **suspects** some unidentified collective Resonance phenomenon. They cannot prove it, reproduce it, name it, or connect it to the first lights. Never write that Aureth knows or can teach it (§2.2).' : ''}`)),
];

// ---------------- NPCs ----------------
const npc = (id: string, name: string, role: string, src: string, status: CanonStatus, f: Partial<NPC>): NPC => ({
  ...base(id, src, status), name, role, tags: [], publicInfoMd: '', privateInfoMd: '', wants: '', fears: '', knowsMd: '', mistakenBeliefsMd: '',
  relationship: '', lastSeen: '', status: 'UNMET', visibility: 'DM_ONLY', ...f,
});
const official = (id: string, name: string, role: string, notes: string) =>
  npc(id, name, role, bib('6.4'), 'WORKING', { tags: ['imperium'], privateInfoMd: `**WORKING name** (bible §6.4: not individually approved). ${notes} Answers to Seraphine; has no veto over her commands.` });

export const npcs: NPC[] = [
  npc('npc-seraphine', 'Empress Seraphine I Vael', 'Absolute sovereign of the Solar Imperium', bib('6.2'), 'LOCKED', {
    visibility: 'PLAYER_SAFE', tags: ['imperium', 'house-vael'],
    publicInfoMd: 'Empress of the Solar Imperium and head of House Vael. Her word is law in Solmourn.',
    privateInfoMd: 'The most feared person in Solmourn. An **Imperial Strategist**: calm, calculating, disciplined, frighteningly competent - not a duelist. Legally absolute, physically constrained by logistics, energy, intelligence and engineering. Capable of calculated atrocities; may try to appropriate any solution the party finds. Not a misunderstood benevolent administrator: her rationality does not absolve her cruelty.\n\n> "Mercy is mine to grant. It is not yours to presume."\n\n**WORKING numbers:** age ~52; reign ~677-700 AS.',
    wants: 'Humanity to survive - under House Vael.', fears: 'A solution to the crisis that she does not control.',
    knowsMd: 'The Everflame is failing and why (as far as her engineers understand it); the true cost of each allocation choice.',
    mistakenBeliefsMd: 'Underestimates cooperation beyond her control. Frightened subordinates distort her intelligence. She does **not** know the other Embers exist and has no foreign channel.',
  }),
  npc('npc-aurelia', 'Crown Princess Aurelia Vael', 'Heir; loyal reformer within the monarchy', bib('6.3'), 'WORKING', { tags: ['house-vael'], privateInfoMd: '**WORKING name/age (~26).** Capable; wants gentler methods but supports the dynasty. House Vael is united (LOCKED): she is not a secret rebel and will not lead a coup.', wants: 'A dynasty that deserves its power.', fears: 'Inheriting a dead city.' }),
  npc('npc-lucien', 'Prince Lucien Vael', 'Loyal militarist', bib('6.3'), 'WORKING', { tags: ['house-vael'], privateInfoMd: '**WORKING name/age (~22).** Believes order is kept by force. Loyal to Seraphine.', wants: 'To prove himself to the Empress.', fears: 'Being thought soft.' }),
  npc('npc-hadrian', 'Lord Hadrian Vael', 'Loyal isolationist elder', bib('6.3'), 'WORKING', { tags: ['house-vael'], privateInfoMd: '**WORKING name/age (~74).** Elder of the house; distrusts anything from outside the city or the dynasty.', wants: 'Nothing to change.', fears: 'The unknown.' }),
  official('npc-veyr', 'Dr. Cassian Veyr', 'Chief Thermal Architect (Thermal Stewardship)', 'Understands the failing stabilization systems better than anyone alive, and knows he cannot build a replacement sun.'),
  official('npc-voss', 'General Ilyra Voss', 'High Marshal (Imperial High Command)', 'Commands the Legions.'),
  official('npc-thane', 'Malrec Thane', 'Director, Office of Resonant Security', 'Runs political intelligence and Resonant regulation. The ORS is not omniscient and its investigations can be mistaken.'),
  official('npc-saren', 'Lady Mirelle Saren', 'Chancellor (Imperial Chancery)', 'Decrees, appointments, records.'),
  npc('npc-corven', 'Mother Elian Corven', 'First Luminary of the Vigil', bib('6.4'), 'WORKING', { tags: ['vigil'], privateInfoMd: '**WORKING name.** Head of the Vigil hierarchy; removable by the Empress. Does not know what the nine rays originally meant.' }),
  npc('npc-mara', 'Mara Venn', 'Frostward organizer', bib('9.1'), 'WORKING', {
    tags: ['cinders', 'frostward'], publicInfoMd: 'A Frostward organizer who gets food, blankets and information to where they are needed.',
    privateInfoMd: '**WORKING NPC** (bible §9.1): Cinder Network coordinator, former Foundries logistics. She is **not** the legacy kit\'s missing engineer\'s sister (owner decision 2026-11-13). Her Cinder role is DM-only until the party earns it. The Cinders are neither automatically heroic nor a mandatory quest giver. Species OPEN.',
    wants: 'Her people warm and alive; the seven missing workers accounted for.', fears: 'ORS infiltration; that helping the party exposes the network.',
    knowsMd: 'The seven names from the sign-in board, where aid is moving, which constables look away. Not where any worker is. Nothing about other Embers or Concordance.',
  }),
  npc('npc-tarin', 'Tarin Holt', 'Frostward courier and scout', bib('9.1'), 'WORKING', { tags: ['cinders'], publicInfoMd: 'A fast, sharp-eyed Frostward courier.', privateInfoMd: '**WORKING NPC.** Cinder courier/scout. Knows the outer-ring routes toward the Mahwah/Ramapo bands.', wants: 'To be trusted with something that matters.', fears: 'Being the one who leads the ORS home.' }),
  npc('npc-elara', 'Dr. Elara Senn', 'Former thermal engineer', bib('9.1'), 'WORKING', { tags: ['cinders', 'engineer'], publicInfoMd: 'A former Stewardship thermal engineer who now fixes what she can in the outer rings.', privateInfoMd: '**WORKING NPC.** Understands failing grid systems. She does **not** understand Concordance and cannot explain it.', wants: 'The grid kept honest.', fears: 'That the numbers really do require sacrifice.', knowsMd: 'How heat arteries, exchangers and load shedding work; what deferred maintenance looks like.' }),
  npc('npc-ilan-rook', 'Ilan Rook', 'Maintenance worker, Frostward Thermal Exchange 17', OWNER, 'LOCKED', { status: 'MISSING', tags: ['exchange-17', 'missing'], publicInfoMd: 'A maintenance worker at Exchange 17, missing since the blackout.', privateInfoMd: '**LOCKED (owner decision 2026-11-13):** one of the seven; disappears deeper inside Exchange 17. His final fate is determined by the party\'s actions and later events, not predetermined. His personality, motives, history and species are OPEN: invent them from play and record them.', wants: 'OPEN.', fears: 'OPEN.' }),
  npc('npc-workers-trapped', 'The four trapped workers', 'Maintenance workers trapped in the collapsed lower service gallery', OWNER, 'LOCKED', { status: 'MISSING', tags: ['exchange-17', 'missing'], publicInfoMd: 'Four Exchange 17 maintenance workers who never came up.', privateInfoMd: '**LOCKED (owner decision 2026-11-13):** four of the seven, trapped in the collapsed lower service gallery and potentially rescuable. Names, species and condition are OPEN. They have seen the failing regulator and the withdrawn reports\' subject. The party is not required to rescue them.', wants: 'To get out.', fears: 'The cold; being forgotten.' }),
  npc('npc-workers-detained', 'The two detained workers', 'Maintenance workers held by Imperial security', OWNER, 'LOCKED', { status: 'MISSING', tags: ['exchange-17', 'missing'], publicInfoMd: 'Two Exchange 17 maintenance workers taken by Imperial security.', privateInfoMd: '**LOCKED (owner decision 2026-11-13):** two of the seven, detained after encountering suppressed maintenance reports. Names, species, where they are held and what becomes of them are OPEN and depend on play.', wants: 'To go home alive.', fears: 'Being made an example of.', knowsMd: 'Which maintenance reports were withdrawn, and why they mattered.' }),
  ...(['npc-tomas:Tomas Venn:Engineer (legacy 8-session kit)', 'npc-joren:Joren Pike:Caretaker (legacy 8-session kit)', 'npc-seren:Inspector Seren Vale:ORS inspector (legacy 8-session kit)'] as const).map((row) => {
    const [id, name, role] = row.split(':');
    return npc(id, name, role, LEGACY, 'RETIRED', { tags: ['legacy', 'retired'], privateInfoMd: '**RETIRED legacy record** (owner decision 2026-11-13; bible §12.2). Kept for history only; not part of the current campaign. Do not use as current canon.' });
  }),
];

// ---------------- Timeline ----------------
const tl = (id: string, sort: number, whenLabel: string, title: string, status: CanonStatus, src: string, bodyMd: string): TimelineEntry => ({
  ...base(id, src, status), sort, whenLabel, title, canonStatus: status, bodyMd, playerMd: '', visibility: 'DM_ONLY',
});
export const timeline: TimelineEntry[] = [
  tl('tl-discovery', -50, '~2180 CE', 'Humanity develops Resonance', 'WORKING', bib('1.1'), 'Working historical date. Scientific, corporate and state experimentation with Resonance follows.'),
  tl('tl-divergence', -40, '~2180 CE onward', 'The Divergence begins', 'LOCKED', 'Canon Amendment 001 §1', 'Biological and technological branching of human-descended peoples begins after the discovery of Resonance and continues across seven centuries: heritable bioengineering, Resonance-stabilized heredity, synthetic personhood. An umbrella history, not one event. Individual species origins and dates are WORKING. It created no Embers and explains nothing about Concordance.'),
  { ...tl('tl-sundering', 0, '~2230 CE · 0 AS', 'The Sundering', 'LOCKED', bib('1.1'), 'Experimentation creates **Dissonance**, a planet-scale interference phenomenon. The natural sun is **not destroyed**: it remains in the sky, but Dissonance prevents its normal light and heat from reaching the surface. The world becomes lethally cold; civilization collapses across most of Earth. **Public knowledge (owner decision 2026-11-13):** "the Sundering" is the common name and ordinary citizens know the basic accounts; the Dissonance mechanism, the sun\'s true condition and the nine-Ember founding stay DM-only.'), visibility: 'PLAYER_SAFE' as const, playerMd: 'Seven centuries ago the sky went dark and the world froze. This catastrophe is called the Sundering. Cities were lost and most of humanity died.' },
  tl('tl-first-concordance', 0.1, 'The same moment', 'The nine first lights', 'LOCKED', bib('1.2'), '**Nine separate groups** at nine distant locations unknowingly achieve a simultaneous, emergent alignment of Resonance, creating **nine artificial suns**. They had no recipe and were not consciously casting. Later engineers build machinery to **stabilize and maintain** suns that already existed.'),
  tl('tl-survey', 10, '~10 AS', 'The survey of the nine', 'LOCKED', bib('2.3'), 'A historical survey maps the original nine Embers and pre-Sundering geography. A copy survives in the Mahwah/Ramapo archive.'),
  tl('tl-vigil', 30, 'Before ~50 AS', 'The Vigil of the First Light arises', 'LOCKED', bib('7.2'), 'Its sacred symbol, a golden disk with **nine rays**, originally referenced the nine Embers. Centuries later the meaning is forgotten and reinterpreted as virtues.'),
  tl('tl-isolation', 50, '~50 AS', 'Solmourn severs outside contact', 'LOCKED', bib('2.3'), 'Solmourn deliberately cuts communications and trade. The Old Relay is decommissioned around this time.'),
  tl('tl-contact-collapse', 350, '~300-400 AS', 'Inter-Ember contact collapses elsewhere', 'LOCKED', bib('2.3'), 'General collapse of contact among the other Embers.'),
  tl('tl-relay-salvage', 430, '~430 AS', 'The Old Relay is salvaged', 'LOCKED', bib('9.2'), 'Salvaged, and eventually passed into underground hands.'),
  tl('tl-reign', 677, '~677 AS', "Seraphine's reign begins", 'WORKING', bib('6.2'), 'Working biographical number; not approved as a hard date.'),
  { ...tl('tl-present', 700, '~700 AS (≈2930 CE)', 'The present', 'LOCKED', bib('1.1'), 'Seven centuries after the Sundering. The Everflame is failing for real engineering reasons. The campaign begins with heat failures in Frostward.'), visibility: 'PLAYER_SAFE' as const, playerMd: 'The present is about 700 AS: seven centuries after the Sundering.' },
];

// ---------------- Authored lore: factions (WORKING) and player-safe knowledge ----------------
const lore = (id: string, title: string, category: string, status: CanonStatus, visibility: Visibility, src: string, bodyMd: string, playerMd = '', order = 9000): LoreEntry => ({
  ...base(id, src, status), title, category, canonStatus: status, visibility, bodyMd, playerMd, tags: [], order,
});
const faction = (id: string, title: string, src: string, mandate: string, low: string, mid: string, high: string) =>
  lore(id, title, 'Factions at the table', 'WORKING', 'DM_ONLY', `${src}; clock behaviour ${AUTHORED}`,
    `**Mandate (from the bible):** ${mandate}\n\n**What they do as the clocks move (WORKING prep, not canon):**\n- **Quiet (clocks 0-2):** ${low}\n- **Tense (3-4):** ${mid}\n- **Crisis (5-6):** ${high}`);
const safe = (id: string, title: string, src: string, text: string, order: number) => lore(id, title, 'Player knowledge', 'LOCKED', 'PLAYER_SAFE', src, text, text, order);

export const authoredLore: LoreEntry[] = [
  faction('fac-ors', 'Office of Resonant Security (ORS)', bib('6.4, 8.3'), 'Political intelligence, counterinsurgency, Resonant regulation, repression. Not omniscient; not the army.',
    'Interviews, file-building, watching licensed Resonants. An inspector asks polite questions.', 'Informants, targeted arrests, raids on suspected safehouses; checkpoints tighten.', 'Disappearances, collective retribution against suspected support networks; may request Legion or Ascendancy support.'),
  faction('fac-legions', 'Imperial Legions', bib('8.3'), 'Conventional professional military: armored infantry, drones, constructs, vehicles.',
    'Garrison duty and infrastructure guards.', 'Cordons around critical stations; escorts for Stewardship crews.', 'Occupation of districts; enforcement of emergency decrees.'),
  faction('fac-ascendancy', 'Solar Ascendancy', bib('8.2'), 'Hereditary warrior houses with elite training and equipment. Not genetically superior. House names are WORKING.',
    'Ceremonial presence; rarely seen in the outer rings.', 'A single Ascendant shown publicly as a warning.', 'Direct intervention. Early PCs should flee; late PCs can challenge one with preparation, terrain and allies.'),
  faction('fac-vigil', 'Vigil of the First Light', bib('7.1'), 'State-sponsored civic faith focused on the Everflame. Not a theocracy; no divine magic. Reform current (working label: Open Flame) argues warmth belongs to all.',
    'Services, charity, processions. The nine-rayed disk is simply part of the scenery.', 'Orthodox Keepers preach endurance; reformists open chapels as warming rooms.', 'The hierarchy splits in practice between legitimizing sacrifice and sheltering the cut-off.'),
  faction('fac-cinders', 'The Cinder Network', bib('9.1'), 'The one organized underground: mutual aid, supply diversion, intelligence, clandestine communications, occasional sabotage. Founded entirely within Solmourn. Cannot defeat the Legions or solve the Everflame. Size is WORKING (~800 operatives, ~12,000 supporters).',
    'Aid crates and whispered routes. Contact is optional and cautious.', 'Asks for favours with real risk; internal argument between reform and revolution.', 'Cells go dark or act rashly; ORS infiltration bites. Members may take morally difficult actions.'),
  faction('fac-stewardship', 'Thermal Stewardship', bib('6.4, 4.2'), 'Heat allocations, grid maintenance, emergency engineering. The engineering necessity can be genuine while the choice of who is sacrificed is policy.',
    'Maintenance crews and honest overwork.', 'Load shedding schedules; crews escorted by Legionaries.', 'Executes emergency disconnections on sovereign order.'),
  lore('lore-g-sundering', 'The Sundering', 'Glossary', 'LOCKED', 'PLAYER_SAFE', OWNER, '**LOCKED (owner decision 2026-11-13):** "the Sundering" is the commonly used name for the historical catastrophe, and ordinary citizens know the name and basic accounts. The Dissonance mechanism, the natural sun\'s true condition, Concordance and the nine-Ember founding remain DM-only. The wording below is WORKING.', 'The **Sundering** is the name everyone uses for the catastrophe seven centuries ago, when the sky went dark and the world froze. Cities were lost and most of humanity died. People learn the outline of it from school, from the Vigil and from family stories. Nobody agrees about much more than that.', 90),
  lore('lore-g-as', 'AS (After the Sundering)', 'Glossary', 'LOCKED', 'PLAYER_SAFE', bib('1.1'), '"AS" dating is used throughout the bible; it is public along with the name of the Sundering.', 'Years are counted **AS**, After the Sundering. The present is about 700 AS.', 91),
  lore('lore-g-exchange', 'Thermal exchange and heat artery', 'Glossary', 'LOCKED', 'PLAYER_SAFE', bib('3.4'), 'Terms from the bible\'s heat description (thermal capture stations, heat arteries, district exchangers, local loops).', 'Heat travels from the Everflame through great insulated pipes called **heat arteries** to **thermal exchanges** in each district. An exchange hands the heat to the local loops that warm homes. The farther out you live, the longer the artery and the less reliable the heat.', 92),
  safe('lore-p-welcome', 'Solmourn and the Everflame', bib('3, 4.1'), 'For seven centuries, since the Sundering, the sky has been dark and the world lethally cold. Fifty-four million people survive in Solmourn, a megacity of towers, tunnels and skyways built in six rings around the **Everflame**, an artificial sun. Its heat is captured and piped outward through great heat arteries. The farther from the Everflame you live, the less reliable that heat is.', 100),
  safe('lore-p-rings', 'The six rings', bib('3.2'), '- **Sanctum** - the restricted heart: the Core works and the Great Basilica.\n- **Crown** - the palace, the ministries, the high nobility.\n- **Gilded Ring** - wealth, academies, licensed Resonance.\n- **Inner Wards** - dense neighborhoods, markets, schools, hospitals.\n- **Foundries** - factories, freight, industrial housing.\n- **Frostward** - thirty million people in crowded outer-ring tenements, with the least reliable heat.\n\nBeyond the heat grid are the **Wastes**, where nobody lives.', 110),
  safe('lore-p-ringism', 'Ringism', bib('3.3'), 'Everyone is legally equal. In practice the ring you were born or live in shapes your heating priority, schools, work, licenses, transit, and how the law treats you. People do move between rings. Frostward is not one thing: it has families, businesses, pride, loyalists, critics and mutual aid.', 120),
  safe('lore-p-imperium', 'The Solar Imperium', bib('6.1, 6.6'), 'Solmourn is ruled by **Empress Seraphine I** of House Vael, an absolute hereditary monarch. Ministries, Legions, district constabularies and the Office of Resonant Security all answer to her. Portraits, oaths and broadcasts present House Vael as humanity\'s protector. What people privately believe ranges from sincere admiration to fear, pragmatism and anger.', 130),
  safe('lore-p-vigil', 'The Vigil of the First Light', bib('7.1, 7.2'), 'The city\'s civic faith honours the Everflame. Its symbol is a **golden disk with nine rays**, seen on chapels, banners and uniforms. Some hold the Everflame sacred; others treat the rites as tradition. Worship is not compulsory.', 140),
  safe('lore-p-resonance', 'Resonance (public knowledge)', bib('5.1, 5.2'), 'A rare few people can work **Resonance**, in one of six disciplines: Radiance, Kinesis, Vitality, Veil, Form and Echo. Roughly one person in a thousand has the aptitude, and most who train master a single discipline. The Imperium licenses Resonance in the inner rings and polices it everywhere; in the outer rings many people think of it as distant or half-mythical.', 150),
  safe('lore-p-life', 'Daily life', bib('3.4'), 'Food comes from indoor farms, fermentation vats and ration guarantees. Water is reclaimed and recycled. People travel by rail, metro, lifts and skyways. There is music, theatre, sport, festivals and street food. Political dissent is dangerous; ordinary joy is not forbidden.', 160),
  safe('lore-p-tone', 'Tone and expectations', `${bib('0.2, 14')}; Canon Amendment 001 §7`, 'Dark science fantasy on a far-future Earth: exploration of a vast city, dangerous fights, survival engineering, mystery and choices that matter. You may play any official D&D species. There are no gods granting magic and no fantasy kingdoms or other planes. Your character may support the Imperium, criticize it, or just try to get by. No faction is the required "right" side.', 170),
  safe('lore-p-divergence', 'The Divergence', 'Canon Amendment 001 §1, §5, §7', 'Many peoples live in Solmourn: humans, elves, dwarves, dragonborn, constructed persons and many more. All of them descend from Earth\'s humanity, changed over centuries by biotechnology, Resonance-altered heredity and synthetic engineering. That long history is called **the Divergence**. Mixed neighbourhoods are normal. Species does not decide anyone\'s loyalty, status or character; where you live and what you can access matters far more. A Crown goblin and a Frostward human may have little in common.', 175),
];

// ---------------- Canon decisions ----------------
const dec = (id: string, topic: string, status: CanonStatus, src: string, rationaleMd: string, f: Partial<CanonDecision> = {}): CanonDecision => ({
  ...base(id, src), topic, status, rationaleMd, options: [], rejected: [], ...f,
});
export const canonDecisions: CanonDecision[] = [
  dec('dec-embers-name', 'Collective name of the original artificial-sun cities', 'LOCKED', bib('2.1'), 'Decided: **Embers**. Do not use "Pyres" or "havens".', { selectedOption: 'Embers', rejected: ['Pyres', 'havens'] }),
  dec('dec-prophecy', 'Wording and reliability of the Unbound prophecy; individual, collective or ambiguous', 'OPEN', bib('17 #1'), 'The legacy kit\'s draft poem (the "Sixth Canticle") is unapproved working text only.'),
  dec('dec-ending', 'Ending mechanics and restoration costs', 'OPEN', bib('17 #2'), 'Must not be predetermined. No button, NPC, artifact or foreign Ember solves it automatically.'),
  dec('dec-foreign-embers', 'Do the other Embers still function at 700 AS? Present foreign leaders', 'OPEN', bib('17 #3'), ''),
  dec('dec-vael-names', 'Names and ages of House Vael heirs and ministry officials', 'WORKING', bib('17 #4'), 'Proposals: Aurelia (~26), Lucien (~22), Hadrian (~74); Veyr, Voss, Thane, Saren, Corven.'),
  dec('dec-ascendancy', 'Five Ascendancy house names; military strength and ranks', 'WORKING', bib('17 #5'), 'Proposals: Varkhos, Caelith, Noxmere, Solvaris, Aurelian. Force estimates ~350,000 Legions, ~180,000 constabulary, ~35,000 ORS, ~2,000 Ascendants are provisional.'),
  dec('dec-engineering', 'Infrastructure capacities and economic statistics', 'OPEN', bib('17 #6'), 'Record a WORKING estimate whenever an adventure depends on a number.'),
  dec('dec-catalogs', 'Class rules, Pattern directory, RP costs and overcasting balance', 'PLAYTEST', bib('17 #7'), 'The discipline mapping, exclusions and twelve original Patterns are proposals awaiting your approval. Non-SRD spell metadata is unverified (one third-party index); see the Pattern directory coverage view.'),
  dec('dec-session-prep', 'Session titles, scenes, encounters, clue placement, stat cards', 'WORKING', bib('17 #8'), 'All fifteen session prep cards, branches, clues and stat cards in this app are WORKING prep written for you to edit. The five arc names and level ranges come from the worldbuilding conversation and are not in the bible.'),
  dec('dec-legacy-retired', 'Legacy names: Tomas Venn, Joren Pike, Seren Vale, Station F-17, "The First Flicker"', 'LOCKED', `${bib('12.2')}; owner decision 2026-11-13`, 'Retired as primary material. The opening uses the bible\'s current cast (Mara Venn, Tarin Holt, Dr. Elara Senn, the ORS). Records you already used are preserved as history.', { selectedOption: 'Retire; preserve historical records' }),
  dec('dec-mara-role', "Mara Venn's role", 'LOCKED', `${bib('9.1')}; owner decision 2026-11-13`, 'Bible §9.1 role: Cinder coordinator, former Foundries logistics. Not merged with the legacy missing engineer\'s sister. The NPC herself remains WORKING, as the bible lists her.', { selectedOption: 'Cinder coordinator (bible §9.1); not the legacy sister', rejected: ['Sister of the missing engineer'] }),
  dec('dec-sundering-public', 'Public name for the catastrophe', 'LOCKED', OWNER, '**Resolved 2026-11-13.** "The Sundering" is the commonly used name; ordinary citizens know the name and basic historical accounts. The Dissonance mechanism, the natural sun\'s true condition, Concordance and the nine-Ember founding remain DM-only. Player-facing lore, the timeline and the glossary now use it.', { selectedOption: '"The Sundering" is the common public name' }),
  dec('dec-exchange-17', 'The opening location', 'LOCKED', OWNER, '**Resolved 2026-11-13.** Frostward Thermal Exchange 17 ("Exchange 17"): an aging thermal distribution and maintenance facility serving Frostward neighbourhoods. It is not the retired Station F-17 and shares none of its history, characters, maps or story content. It contains no clues to Solmourn\'s New York identity.', { selectedOption: 'Frostward Thermal Exchange 17', rejected: ['Station F-17 (retired legacy)', 'Station Forty-Two (not in the bible)'] }),
  dec('dec-seven-workers', 'The missing workers', 'LOCKED', OWNER, '**Resolved 2026-11-13.** Exactly seven maintenance workers disappear in the opening blackout: four trapped in a collapsed lower service gallery (rescuable), two detained by Imperial security after encountering suppressed maintenance reports, and Ilan Rook, who vanishes deeper inside. Ilan\'s final fate is not predetermined. The party has multiple ways to learn where each went and need not rescue everyone. The old "43 missing residents" scenario stays retired. Everything not listed (the other six names, their species, conditions, where the two are held) stays OPEN.', { selectedOption: 'Seven workers: four trapped, two detained, Ilan Rook missing', rejected: ['43 missing residents (legacy)'] }),
  dec('dec-species-sources', 'Which official sourcebooks the table owns and uses for species', 'OPEN', 'Canon Amendment 001 §3, §6', 'Species from books outside the SRD are entered by hand from the table\'s own copy, with book and page, and reviewed by the DM.'),
  dec('dec-species-2024', 'Adopt any 2024 species revisions?', 'OPEN', 'Canon Amendment 001 §4.2, §6', 'Default: no. The baseline is 2014. 2024 species are listed but cannot be selected, so 2014 species bonuses are never stacked with 2024 background bonuses.'),
];

// ---------------- Clocks and state trackers ----------------
const clock = (id: string, name: string, value: number, group: 'core' | 'state', src: string, meaningMd: string): Clock => ({
  ...base(id, src, 'WORKING'), name, value, max: 6, group, meaningMd, reasonHistory: [],
});
export const clocks: Clock[] = [
  clock('clk-everflame', 'Everflame deterioration', 1, 'core', bib('10.4'), 'Working start 1/6. Repairs, storage and shedding can delay it, not indefinitely reverse it. Move it for fiction and player decisions, never on a timer.'),
  clock('clk-ors', 'ORS scrutiny', 0, 'core', bib('10.4'), 'Working start 0/6. Rises with conspicuous unauthorized Resonance, intrusion and defiance; clever plans can lower it. Open defiance of the Mercy Decree sets it to maximum.'),
  clock('clk-unrest', 'Public unrest', 1, 'core', bib('10.4'), 'Working start 1/6. Grows with heat cuts, rationing and leaks; can become reform, revolt or negotiation.'),
  clock('clk-heat', 'Frostward districts without heat', 0, 'state', `${bib('10.4')}; ${AUTHORED}`, 'How much of Frostward is cut off. The Mercy Decree (session 6, ~84,000 residents) is one step unless the party changes it.'),
  clock('clk-cinder-exposure', 'Cinder exposure', 0, 'state', `${bib('10.4')}; ${AUTHORED}`, 'How close the ORS is to the network. Rises when the party is careless with Cinder contacts.'),
  { ...clock('clk-workers', 'Missing workers accounted for', 0, 'state', OWNER, 'How many of the seven Exchange 17 workers the party has located or resolved, whatever the outcome (rescued, found dead, learned to be in custody). Starts 0/7. The party is not required to account for all seven.'), max: 7 },
  clock('clk-research', 'Collective-Resonance research', 0, 'state', `${bib('10.4')}; ${AUTHORED}`, 'The party\'s earned understanding of the lost phenomenon (sessions 10-12). Advance only for real observations and experiments. Nobody can simply explain it.'),
];

// ---------------- Consistency rules (Bible §16) ----------------
const rule = (id: string, severity: CanonRule['severity'], pattern: string, message: string, suggestion: string, extra: Partial<CanonRule> = {}): CanonRule => ({
  id, campaignId: CAMPAIGN_ID, severity, pattern, flags: 'i', message, suggestion, exemptIds: [], negationAware: true, ...extra,
});
export const canonRules: CanonRule[] = [
  rule('r2-sundering', 'error', 'sundering', 'The catastrophe is written "the Sundering" - normal capitalization.', 'Replace with "Sundering".', { mustEqual: 'Sundering', negationAware: false }),
  rule('r2-collective', 'error', '\\b(Pyres|havens)\\b', 'The original cities are the **Embers**. "Pyres" and "havens" were rejected.', 'Use "Embers".', { exemptIds: ['dec-embers-name'] }),
  rule('r2-nine', 'error', '\\b(two|three|four|five|six|seven|eight|ten|(?!9\\b)\\d+)\\s+((original|artificial|first)\\s+)*(suns|Cores|Embers|first lights)\\b', 'Exactly NINE original Embers and artificial suns - never eight.', 'Check the count: nine, simultaneously.', { negationAware: false }),
  rule('r2-sessions', 'error', '\\b(eight|8)[- ]sessions?\\b', 'The campaign is exactly FIFTEEN sessions.', 'Replace with fifteen.', { negationAware: false }),
  rule('r2-population', 'warning', '\\b12 million\\b', 'Solmourn has 54 million people (12 million is retired).', 'Use 54 million.', { negationAware: false }),
  rule('r2-sabotage', 'warning', 'sabotag(e|ed|ing) (of )?the (Everflame|Core|sun)|Everflame\\b[^.]{0,40}\\bsabotag|\\bcursed\\b', 'The Everflame fails for real engineering reasons. It is not sabotaged or cursed.', 'Keep sabotage as a mistaken belief at most.'),
  rule('r2-sun-destroyed', 'warning', '\\bsun\\b[^.]{0,40}\\b(destroyed|died|dead|extinguished|burned out|gone forever)\\b', 'The natural sun was not destroyed; Dissonance obstructs its light and heat.', 'Describe it as obstructed.'),
  rule('r2-suns-built', 'warning', '\\b(invented|designed|engineered|summoned|built|constructed)\\s+(the\\s+)?((nine|original)\\s+)*(artificial suns|first lights|Everflame)\\b', 'The suns emerged spontaneously; later technology only stabilized them.', 'Say the machinery stabilizes an existing sun.'),
  rule('r2-concordance-known', 'error', '\\b(knows|teach(es)?|taught|can explain|masters?)\\b[^.]{0,20}\\bConcordance\\b|Concordance (device|manual|spellbook|technology|ritual)', 'Concordance is completely lost. Nobody alive can teach it; Aureth only suspects an unnamed phenomenon.', 'Rewrite as earned rediscovery or unproven suspicion.'),
  rule('r2-monarchy', 'error', 'constitutional monarchy|\\bveto\\b[^.]{0,30}\\b(Empress|Seraphine)|\\b(council|parliament|regency)\\b[^.]{0,40}\\boverrul', 'The Solar Imperium is an absolute monarchy; no adviser or council can veto the Empress.', 'Remove the check on her power.'),
  rule('r2-dynasty', 'warning', 'rebel princess|secret(ly)? (rebel|plotting)|House Vael\\b[^.]{0,30}\\b(divided|fractured|civil war)', 'House Vael is united. There is no secret rebel heir.', 'Members may disagree about methods only.'),
  rule('r2-frostward', 'error', 'Frostward\\b[^.]{0,40}\\b(wasteland|wilderness|barren|uninhabited|abandoned|empty ruin)', 'Frostward is dense, inhabited city - not the Wastes.', 'Move the scene to the Wastes or describe the crowding.'),
  rule('r2-monsters', 'warning', 'Dissonance[- ](demon|monster|horror|spawn|beast|creature)s?|\\bundead (horde|army|armies|legion)s?\\b', 'No Dissonance monsters or undead hordes. Threats are people, machines, wildlife and infrastructure.', 'Use a person, a machine or an environmental threat.'),
  rule('r2-human-only', 'error', 'human[- ]only|humans only|all (player characters|PCs|characters) are human', 'RETIRED: human-only character eligibility (Canon Amendment 001). Any official species is allowed.', 'Remove the restriction.'),
  rule('r2-species-caste', 'warning', '\\b(elves|dwarves|orcs|goblins|tieflings|dragonborn|halflings|gnomes|warforged|species)\\b[^.]{0,20}\\b(are|is) (evil|savage|inferior|superior|subordinate|chosen)\\b|species caste', 'No species has compulsory morality, rank or destiny; ringism stays the central inequality.', 'Make it a local prejudice of particular people, agreed at Session Zero.'),
  rule('r2-planes', 'warning', '\\b(Feywild|Shadowfell|Nine Hells|Celestia|Astral Plane|elemental planes?|Sigil|pantheon)\\b', 'Solmourn is Earth: no planes or pantheons. Translate species origins, not mechanics.', 'Use a Divergence origin (amendment §3).'),
  rule('r2-divine', 'warning', '\\b(the gods|a god|goddess|divine (magic|spell|power|intervention))\\b', 'No gods or divine magic. The Everflame is human-made.', 'Reframe as faith without miracles.'),
  rule('r2-cinder-foreign', 'warning', 'Cinders?\\b[^.]{0,40}\\b(foreign|another Ember|Vesperdeep|sponsor)', 'The Cinders are locally founded, with no foreign sponsorship or awareness of other Embers.', 'Keep the network local.'),
  rule('r2-chosen', 'warning', '\\b(chosen one|predestined|destined to|chosen at birth)\\b', 'No PC is predestined; the Unbound is open and player-dependent.', 'Keep it open.'),
  rule('r2-dark-evil', 'warning', '\\b(darkness|the dark|the night)\\b[^.]{0,20}\\b(is|are) evil\\b|purge the night', 'Darkness is a physical condition, not evil.', 'Reframe the danger as cold, scarcity or policy.'),
  rule('r2-all-same', 'warning', '\\b(all|every)\\b[^.]{0,30}\\b(Embers?|cit(y|ies))\\b[^.]{0,30}\\b(monarch|autocrac|dictator)', 'The nine Embers have nine different political identities.', 'Check the roster in Places.'),
];

// ---------------- Group-experiment tracker config (PLAYTEST) ----------------
export const trialConfig: TrialConfig = {
  emergentLabel: 'Emergent event',
  controlledLabel: 'Collective experiment',
  emergentStages: [{ name: 'Establish', dc: 13 }, { name: 'Hold', dc: 15 }, { name: 'Resolve', dc: 16 }],
  controlled: { minParticipants: 2, minSources: 2, leadDc: 15, rpPerCaster: 2, usesPerLongRest: 1, durationNote: 'Concentration, up to 1 minute' },
  effects: ['Shield a corridor or small area', 'Stabilize a failing device', 'Boost diagnostics', 'Steady a local instability'],
  forbiddenPattern: 'ninth sun|tenth sun|new sun|another sun|create a sun|make a sun|restore the (natural )?sun|sunlight|planet|whole city|entire city',
  forbiddenMessage: 'Out of scale. A table-level experiment cannot create a sun or restore sunlight; the endgame is decided in play, not by a routine action.',
  dmNote: 'DM-ONLY, PLAYTEST. Concordance is completely lost: nobody can teach it and no manual exists. Use this only to record what the party observes and attempts in sessions 10-12, and never as a mandatory gate. The DCs are legacy playtest numbers. Record what happened without naming anyone Unbound.',
};
