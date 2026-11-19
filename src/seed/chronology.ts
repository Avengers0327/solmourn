// Chronology layer for the 15-session campaign (seed v5). Everything here is WORKING prep:
// a day-by-day calendar, what happens off-screen, extra scenes in story order, and the six
// working names for the Exchange 17 workers. Only the cited Story Bible anchors are canon.
// The in-world time span (about 10 weeks) was chosen by the owner on 2026-11-18.
import type { LoreEntry, NPC } from '../domain/types';
import { OWNER, base, bib } from './helpers';

export interface ExtraScene { after: number; id: string; title: string; text: string; readAloud?: string }
export interface Chrono {
  /** When the session happens, in campaign days (Day 1 = the Exchange 17 blackout). */
  day: string;
  /** Where the party is coming from. */
  before: string;
  /** What happens off-screen whatever the party does. */
  offscreen: string;
  /** The state of play when the session ends. */
  ends: string;
  /** Story Bible sections the session leans on. */
  bible: string;
  /** Extra detail appended to an existing scene (key = 1-based scene number). */
  beats?: Record<number, string>;
  /** Read-aloud used only when the existing scene has none. */
  readAloud?: Record<number, string>;
  /** Extra scenes inserted after the given existing scene (1-based). */
  add?: ExtraScene[];
}

export const CHRONO: Chrono[] = [
  // ---------------------------------------------------------------- 1
  {
    day: 'Day 1, about 17:40 to 22:00. "T+0" below means the moment the regulator trips.',
    before: 'The party met at Session Zero and has a reason to be in a Frostward ration queue on the first evening.',
    offscreen: 'T+0: the regulator at Exchange 17 trips an emergency lockout, a real engineering failure (Bible §4.1). T+13 min: the lower service gallery collapses with four workers inside. About T+25 min: Ilan Rook swipes a badge at a deeper level and leaves no later record. T+1 h: two workers who had read a withdrawn maintenance report are taken out by Imperial security, and a Stewardship clerk wipes the sign-in board. T+2 h: the Imperial broadcast says the interruption was brief and that nobody was hurt.',
    ends: 'The party holds seven names, at least one lead, a story about what they did in the plaza, and an ORS officer who has seen their faces. Four taps are coming from under the street.',
    bible: '§3.2 Frostward is dense; §3.3 Ringism; §4.1 the Everflame fails for real engineering reasons; §7.2 the nine-rayed disk is only scenery; §9.1 Mara and Tarin; owner decision 2026-11-13 (the seven workers).',
    beats: {
      1: '**When: Day 1, about 17:40 (T+0).** The queue is the weekly fuel-and-protein allocation, so the plaza holds every sort of Frostward resident. Give the party five ordinary minutes first: a vendor disputes a short measure, children chase a toy drone, the Vigil banner swings overhead. Then the flicker. People who work the heat lines are not surprised; the Imperial broadcast says nothing for the first hour.',
      2: '**T+10 to T+40 min.** Give the choice real deadlines. The lift holds 14 people about eleven floors up and the car is cooling fast (trouble in roughly 40 minutes). The clinic\'s emergency heat lasts about an hour and six patients depend on powered equipment. The crush at the shelter doors turns dangerous in about 20 minutes. Saving one does not doom the others, but every missed deadline costs something with a name: an injury, an angry crowd, a debt. A PC who uses Resonance in public should be noted, because the ORS officer at T+4 h will ask who was seen.',
      3: '**T+1 h.** Mara reaches the party with a hand-copied list of the Exchange 17 sign-in board, made before a Stewardship clerk wiped it. The seven names (WORKING except Ilan Rook): Odalys Brandt, night-shift lead; Kofi Marlowe, apprentice; Renske Aldous, pump technician; Davit Sorrel; Ines Calloway, control-gantry technician; Hamid Reyes, inspector; and Ilan Rook. She does not know where any of them is. She will say only that she had the list from "a friend at the gate".',
      4: '**T+2 h.** The walk is about three kilometres through unlit towers, and it doubles as a map of the failure: lit blocks, half-lit blocks, dark blocks, then a frost line visible on the conduit casings. The three routes (Tarin, the dispatch log, the frozen conduits) all end at the same perimeter fence, which keeps the evening moving.',
      5: '**T+3 h.** The drones are reacting to the door\'s emergency lock, not to the party, which is why they glitch. The steam breach vents on a slow cycle of about 20 seconds, and a party that watches twice sees it. The service door itself stays sealed from the street; in session 2 it is bypassed by one of three other ways.',
      6: '**T+4 h.** Constables set up a cordon. Ten minutes later an ORS field officer in a plain coat asks any Resonants to step forward "for their own protection". Nobody has to. The officer notes faces. The Stewardship foreman says the facility is "stabilized and empty". Then the tapping starts again and the officer pretends not to hear it. End the session here.',
    },
    add: [
      {
        after: 3, id: 'a', title: 'At the gate',
        text: '**T+1.5 h.** Families gather at the Exchange 17 perimeter fence in the dark: Odalys Brandt\'s partner, Kofi Marlowe\'s mother with a flask of tea, a neighbour banging a spoon on a pipe. The party hears the human stakes before the machinery. Odalys always worked nights in "the lower gallery". Kofi was in his third week. Hamid Reyes had been "arguing with the office about a report". Nothing here is a roll: let each family member remember one useful fact, and let one of them ask the party for something small and specific, such as carrying a message or bringing a coat.',
        readAloud: 'There is a fence, a row of people, and a thermos going cold in a mother\'s hands. Nobody is shouting. They have all decided, without saying so, to keep their voices low in case someone below is listening for them.',
      },
    ],
  },
  // ---------------------------------------------------------------- 2
  {
    day: 'The night of Day 1 into the morning of Day 2, about 22:30 to 08:00 (T+5 h to T+14 h). The tapping has not stopped.',
    before: 'The party has the seven names, a lead to Exchange 17, and an ORS officer who has seen their faces.',
    offscreen: 'By dawn the Stewardship foreman has reported upward: "equipment failure, contained". Imperial security moves the two detained workers from a district station to the precinct booking desk. A courier carries news of the rescue to the Cinders; nobody tells the party.',
    ends: 'The four trapped workers are out or the party has a hard story about why not. The logs exist or they do not. The ORS has an open file. Ilan Rook\'s trail has been followed, marked or dropped.',
    bible: '§4.1 failing for real engineering reasons; §6.5 surgical terror (keep the ORS precise, not cartoonish); §9.1 the Cinders; owner decision 2026-11-13.',
    beats: {
      1: '**T+5 h, about 22:45.** Three ways in, each with a different first problem. The street door is sealed behind the cordon (a constable who owes a favour, or a night-shift key). The boiler-room crawlway is narrow and cold, so a very large PC or heavy armour needs another way. The canal-side pump gallery is flooded and needs swimming or a boat. Whichever they pick, they reach the regulator hall within about twenty minutes.',
      2: '**T+6 h.** The construct is doing its old job on a shift that is no longer there: mopping a floor, checking valves nobody will open. Its routine is predictable, which is how it can be lured, rebooted or avoided. Water here is near freezing; extended wading is an exposure risk.',
      3: '**T+7 h, about 00:40.** The four, with working names: Odalys Brandt (shift lead, steady, wrist crushed), Kofi Marlowe (young, leg pinned, the first to go hypothermic), Renske Aldous (kept the logs on a slate and cares more about them surviving than about being thanked) and Davit Sorrel (barely spoken since the collapse; he saw which way Ilan went). Their account: the regulator tripped at 17:38; the gallery collapsed about thirteen minutes later; Ilan Rook took the service ladder down soon after. Whether he went to help, to hide or for reasons of his own is yours to decide from play. They also know what the withdrawn report said: a weld on the regulator housing was failing, and Hamid Reyes and Ines Calloway read it aloud at a shift change a week ago.',
      4: '**T+10 h, about 03:40.** The interview is held at the foreman\'s desk, not in a cell. The officer already knows the party was in the plaza and who used Resonance. Three questions: who entered the building, who has seen the logs, and has anyone spoken to the families. Truth, silence and lies all land (br-2-ors). The officer\'s real aim is to have the logs sealed "until verified".',
      5: '**Optional, from about T+11 h.** The trail is only a ladder, chalk and a last badge swipe. If the party follows it now, the trapped workers\' countdown is still running unless they are already out; make the trade-off explicit before they climb down.',
    },
    add: [
      {
        after: 3, id: 'a', title: 'Up and out',
        text: '**T+9 h, about 02:40.** Getting four people up a cold stair at night is its own challenge: carrying Kofi, warming Odalys\'s hand, keeping Renske\'s slate dry. If the party copied the logs first (br-2-evidence), someone reaches the stair hypothermic; if they opened the gallery first, the logs are partly ruined and Renske recites what she can. A Stewardship foreman waits at the top and wants this quiet.',
      },
      {
        after: 4, id: 'b', title: 'Dawn at the gate',
        text: '**T+14 h, about 07:40, Day 2.** The workers leave on stretchers or on foot as heat creeps back into half the district. Families, neighbours and a Vigil Keeper with a cart of broth are waiting. This is the first time Frostward sees the party as people who did something. Heat returns in patches at about 09:00 and the broadcast calls it "restored" by noon. Mara\'s thanks are brief; she says "Come find me" and does not say where.',
        readAloud: 'The light comes up the way it does here after a bad night: slowly, from the high floors down, as if the city were checking each window before it trusted it. Somebody at the fence starts to cry. Somebody else hands out soup.',
      },
    ],
  },
  // ---------------------------------------------------------------- 3
  {
    day: 'Day 3 to Day 7. Morning of Day 3: three stories. Day 4: the booking ledger. Day 5: an independent test. Day 6: the transfer and the substation. Day 7: the morning after.',
    before: 'One night of restored heat. The party has a reputation, good or bad, and perhaps four rescued workers.',
    offscreen: 'Day 3: the broadcast blames unlicensed Resonants. Day 4: a quiet Stewardship inspector finds the weld failure and writes it down. Day 5: the ORS asks the precinct to transfer the two detained workers to ORS holding; the transfer is set for the evening of Day 6 unless something interrupts it. Day 6: the Cinders move aid crates through the market hall.',
    ends: 'Level 4. A working regulator core. A district opinion of the party, a public stance, and whatever has become of the two detained workers and of Ilan Rook.',
    bible: '§3.3 Ringism; §6.5 repression (precise, sometimes mistaken); §9.1 the Cinders are optional; §10.3 session 3 (first significant combat; Imperial citizens are not uniformly cruel).',
    beats: {
      1: '**Day 3, morning.** The district wakes to three explanations. Let the party hear all three from different mouths in the first hour: the broadcast, a market stallholder who "saw a Resonant", and (if rescued) Renske or Odalys saying "it was the weld".',
      2: '**Day 4.** The precinct ledger lists Ines Calloway and Hamid Reyes (WORKING names) as "pending review". They stay in precinct custody until the evening of Day 6; after that they are in ORS holding and the options narrow to bargain, expose or leave. Hamid is calm and trusts the paperwork. Ines is frightened and angry that nobody read the report in time. A young constable privately agrees that something is wrong.',
      3: '**Day 5.** Union technicians or Dr. Senn need about four hours and a protected room. Someone will try to interrupt. The result is the weld and the record of deferred repair: age, not an attack.',
      4: '**Day 5, night.** A drop at the market hall\'s back door. A watcher sees Tarin hand a crate to a woman who looks at nobody. It is not a lead the party must follow.',
      5: '**Day 6, night.** The substation is an old transit platform about 400 metres under the market. The tile lettering is broken beyond reading; keep it that way. The station automaton has guarded a backup regulator core since before the present shift pattern and does not follow into the corridor. A fight is optional.',
    },
    add: [
      {
        after: 4, id: 'a', title: 'Transfer at dusk',
        text: '**Day 6, dusk.** If the two are still in precinct custody, an ORS van backs into the loading bay for the scheduled transfer. A party that acted earlier skips this. One that waited sees the cost. Possible plays: a negotiated delay, a staged blockage, a quiet word with the young constable, a public scene, or letting the van go. This is the ticking clock behind br-3-detained.',
      },
      {
        after: 5, id: 'b', title: 'The morning after',
        text: '**Day 7.** The core buys the district about a week of steadier heat. Whatever the party said in the market is now what people repeat about them. Mara asks them to come to the Foundries "when you are ready". Dr. Senn gives them a way to reach her. Close the arc with a table recap and record Ilan Rook\'s status in br-3-ilan.',
        readAloud: 'There is a new sound in the block this morning: pipes ticking as they warm. People stop on the stairs to listen to it, the way you might listen to someone you thought had left the room.',
      },
    ],
  },
  // ---------------------------------------------------------------- 4
  {
    day: 'Day 11 to Day 12, about a week after the arc closes.',
    before: 'The regulator core bought a quiet week. The party has an invitation or a reason to look at the larger grid.',
    offscreen: 'Day 8 to Day 10: capture output at the Foundries relay hall dips again and Stewardship protects the Crown redundancy test. The ORS asks Foundries constabularies about "unregistered couriers". Dr. Senn is asked to examine a relay hall and says she needs help.',
    ends: 'The party knows the failure is grid-wide. They may know the Cinders and the odd old machine. The ORS may know a party was in a restricted hall.',
    bible: '§3.4 heat arteries and thermal capture; §4.2 political allocation; §9.1 and §9.2 the Cinders and the Old Relay (optional, no readable foreign-city list); §10.3 session 4.',
    beats: {
      1: '**Day 11, morning.** Dr. Senn (or Mara) leads the party about twelve kilometres inward by freight tram. For many PCs it is the first ring checkpoint they have crossed: Frostward papers get the slow line, and that is Ringism in practice (Bible §3.3), not a plot device.',
      2: '**Day 11, midday.** The telemetry shows output falling slightly every year for decades. Dr. Senn compares it with the Crown loops, which are triple-fed. The party can copy, photograph or memorize; either way it has to leave unseen.',
      3: '**Day 11, afternoon.** The ORS sweep is timed to a shift change and wants names more than bodies. Hide in the vent shafts, join the crowd, bluff as contractors, or fight, but the agents would rather arrest quietly than make noise in front of the Foundries.',
      4: '**Day 12.** Optional. Behind a recycling line sits a courier workshop and, under a tarp, a machine the Cinders call the Old Relay. It is in use as a local transmitter. A ring of nine small marks runs round its casing; nobody there can say why. The party meets people, not a plot: decide with the table whether they trust the party.',
    },
    add: [
      {
        after: 2, id: 'a', title: 'What the shift orders say',
        text: '**Day 11.** A Foundries foreman, tired and angry, tells the party what the shift orders really say: capture output is being managed so that inner loops keep full redundancy. He will not testify and he will not be named. This is the cleanest early statement that the allocation is a choice (rev-allocation).',
      },
      {
        after: 4, id: 'b', title: 'Out by night',
        text: '**Day 12, night.** Leaving unseen, with or without Cinder help. A party that was followed adds Cinder exposure +1. Close with the choice of whether to go back to Mara, and what the party now owes or is owed.',
      },
    ],
  },
  // ---------------------------------------------------------------- 5
  {
    day: 'Day 19 to Day 22 (the third week).',
    before: 'The party knows the whole grid is failing and may have the Cinders at their back, or not.',
    offscreen: 'Day 15: Thermal Stewardship reports to the Chancery that capture output cannot cover every loop this winter. Chancellor Saren (WORKING name) asks for options costed by district. Day 18: a Frostward prefect calls a public hearing. Day 20: the Legions are ordered to secure the Foundries/Frostward reservoir for Crown redundancy. Seraphine\'s decisions follow real resource limits (Bible §4.2).',
    ends: 'The party knows a mass disconnection is coming and, roughly, when. The reservoir has a new owner, or no owner.',
    bible: '§4.2 political allocation; §6.2 Seraphine is strategic, not a cartoon villain; §8.3 Legions; §9.1 Mara\'s role; §10.3 session 5.',
    beats: {
      1: '**Day 19.** Dr. Veyr does not attend; his deputy (WORKING: Dr. Veyr\'s staff present honest numbers) lays out the shortfall plainly, which is rare. The prefect asks for "volunteers for temporary relocation". Nobody volunteers. Most of the hearing is a fight about who will be asked to give up what.',
      2: '**Days 20 to 21.** Two days of work. Half the tanks are offline. Repair needs parts from three places, each with its own price. If the party arrives before the Legion, they can start. If after, they work beside Legionaries with orders.',
      3: '**Day 21.** The tribune arrives with a sealed order. He wants no witnesses to an argument. He is also, privately, uneasy about what the reservoir will be used for.',
      4: '**Day 22.** A clerk, Mara\'s source or the tribune\'s own aide lets slip a draft: a disconnection order with a figure and a date window of "within the week".',
    },
    add: [
      {
        after: 4, id: 'a', title: 'Mara tells them',
        text: '**Day 22, night.** Mara tells the party what she is, or an ORS file or a courier\'s slip does it for her (clu-mara-truth). She wants to move people before the order lands and asks whether the party will help. She has no plan that saves everyone and says so.',
        readAloud: 'She sets the cup down carefully, the way you do when your hands want to do something else. "Eighty-four thousand. That is the number I keep seeing. I have been in this long enough to know what a number like that is for."',
      },
    ],
  },
  // ---------------------------------------------------------------- 6
  {
    day: 'Day 28, about 05:30 to night. The announcement is at 06:00 and the heat is due to be cut at 12:00.',
    before: 'The party has had warning, and perhaps a plan. They are about to learn how much a plan is worth.',
    offscreen: 'Day 23 to Day 27: the Chancery finalizes the order and the Legions position cordons. On Day 26 Seraphine approves it after Stewardship tells her the east Frostward loops would trip the main artery if left on. Privileged districts keep their redundant feeds. She is not in the scene; her decree is.',
    ends: 'Depends on the choice: the party is wanted (open defiance, Bible §10.2 #4), in good standing, a known petitioner, or holding a secret. Every outcome reaches session 7.',
    bible: '§10.2 #3 and #4 (LOCKED): about 84,000 Frostward residents; open defiance makes the party immediate enemies of the state; compliant, covert or negotiating PCs are not automatically wanted. §6.5 collective retribution; §14.3 agency.',
    beats: {
      1: '**Hour 0, about 06:00.** Every screen, loudspeaker and tenement hall carries the same notice under the Chancery seal. Give the players the number, the deadline and the three evacuation points. Do not let anyone argue the engineering: it is real, and that is the cruelty of it.',
      2: '**Hours 1 to 6.** 06:00 announcement. 07:30 evacuation points open (three, together able to hold perhaps a third of those affected: WORKING). 09:00 corridors jam. 10:30 a Legion cordon forms at the exchanger. 11:30 final warning. 12:00 the valves close unless stopped. A petition needs to be filed by about 10:00 to matter. Covert work at the exchanger has to start by about 10:30. An open defier can act at any hour, and an Ascendant arrives in round 4.',
      3: '**Hour 5 to 6.** The exchanger is guarded by Legionaries and a centurion, not fools. Whatever the party attempts here is judged against the clock, and every failure moves ORS scrutiny.',
      4: '**Day 28, afternoon to night.** Count by name what was saved and lost. Tell the players plainly how the city now sees them. If they openly defied, notices go up by evening; if not, the quiet looks are as heavy as any notice. Collective punishment begins only where the ORS believes it has found support (Bible §6.5), and it is sometimes mistaken.',
    },
    readAloud: {
      2: 'The corridor holds the sound of thousands of people trying not to run. Someone is carrying a grandmother in a blanket. Someone else is carrying a caged bird. A Legionary at the end of the hall keeps repeating the same sentence, and every time she says it, a little less of her voice is in it.',
      4: 'By nightfall you can count what you did by the lights that are on. Some blocks are warm and silent. Some are dark and loud. A few people in the street look at you the way you look at a bridge you have not decided to cross.',
    },
    add: [
      {
        after: 2, id: 'a', title: 'The warming-room chapel',
        text: '**Hours 3 to 4.** A reformist Keeper opens a Frostward chapel as a warming room. People who cannot reach an evacuation point are already arriving. The chapel disk has nine rays, each a different glyph rather than nine identical lines (clu-disk-count). Do not explain it. The Keeper asks only that the party not bring weapons inside.',
      },
    ],
  },
  // ---------------------------------------------------------------- 7
  {
    day: 'Day 29 to Day 35: a week of consequences and a journey of more than twenty kilometres toward Mahwah/Ramapo.',
    before: 'The decree is carried out, delayed, or defied. The party is wanted, in good standing, a petitioner, or holding a secret.',
    offscreen: 'Day 29: wanted notices go up for open defiers. The ORS interviews suspected collaborators; families and workplaces are pressured where it believes it has found a link, and it makes mistakes (Bible §6.5). Day 30: the Chancery announces "orderly relocation complete". Day 31: Stewardship quietly reverses some cuts it cannot sustain.',
    ends: 'The party has crossed the outer ring, has chosen how to be seen, and is standing in the Ramapo tenements with a lead to the buried archive.',
    bible: '§3.2 Frostward is dense (travel through crowds, not empty land); §6.5 repression; §10.2 #5 sessions 7 to 9; §10.3 session 7 (never assume all PCs joined the resistance).',
    beats: {
      1: '**Day 29.** Open with honest consequences and not with a lecture. A wanted party hears a knock at a safehouse door; a compliant party is thanked by officials and glared at by neighbours; a negotiating party gets a summons that is neither. The city does not have one opinion of them.',
      2: '**Days 30 to 31.** Three independent leads: a survey marker in a tenement courtyard, a Keeper\'s reliquary record, a Stewardship salvage manifest that does not add up. Any one is enough. They point to the same place from different directions.',
      3: '**Days 32 to 34.** Roughly 25 kilometres. Public transit is one day and leaves sightings. The Underways take about three days and are cold and unseen. Official papers or an escort take a day and a half and tell the Imperium where the party went.',
      4: '**Day 34.** Someone owns the only bridge. They are a business, not villains, and they do not care about the decree. A toll, a bluff, a favour, a detour or a fight all work.',
    },
    add: [
      {
        after: 3, id: 'a', title: 'A night on the way',
        text: '**Night of Day 33.** A hostel, a Vigil guest hall or a stairwell landing. Give each PC a quiet moment: rumours of arrests, a stranger who recognizes them, a child who wants to be told a story. This is where the ORS\'s reach is felt but not explained. No new plot here.',
      },
      {
        after: 4, id: 'b', title: 'Ramapo',
        text: '**Day 35.** The outer ring thickens into stacked towers, markets on the skyways and laundry frozen stiff between buildings. The survey marker sits in a courtyard under four storeys of washing. The way down is behind a stair that every resident knows and no one uses.',
        readAloud: 'Ramapo does not look like the edge of anything. It looks like a city that has simply gone on. Forty floors of lit windows, an old man selling soup from a cart, and somewhere beneath all of it, a door that has been closed a very long time.',
      },
    ],
  },
  // ---------------------------------------------------------------- 8
  {
    day: 'Day 36 to Day 38 (three days underground).',
    before: 'The party is in Ramapo with a survey credential, a manifest or an escort.',
    offscreen: 'An Imperial salvage crew follows a manifest trail a day behind. If the party is wanted, the ORS adds a tracer. The residents above fear a building inspection and mostly want to be left alone.',
    ends: 'The party has read the survey and seen the overlay, or has failed to. Either way the old name of the city is now known or knowable.',
    bible: '§3.1 Solmourn is built on New York (revealed by signage and maps, never stated); §10.2 #5 (map is history, not current status); §2.3 nobody in Solmourn knows the other Embers exist; §10.3 session 8.',
    beats: {
      1: '**Day 36, morning.** The descent takes about half a day. Each level is older. A building inspector\'s tag on the first door gives the salvage crew\'s timetable away to anyone who reads it.',
      2: '**Day 37.** The stacks are the dangerous part. Sentries accept the survey credential if the party has it (clu-survey-marker). The Dissonance pocket is a physical hazard, not a creature: gravity lurches, sound drops out, a discharge crawls across the shelves.',
      3: '**Day 38, morning.** The map room is a quiet room with a table-sized survey of the world, nine marked lights and place names in an old script. Let the players read it themselves. Do not translate for them.',
      4: '**Day 38, afternoon.** The overlay (or its duplicate in a sealed municipal stair if the first is lost) lines up the Everflame with a city grid. Stop talking when it fits.',
    },
    add: [
      {
        after: 1, id: 'a', title: 'The collapsed school',
        text: '**Day 36, afternoon.** A pre-Sundering school with a painted sign for a gymnasium and a corridor of tiny coat hooks. Signage names MAHWAH (clu-archive-signage). The point is texture: an older world that looked like this. The party may find the first hint of the name and not know it.',
      },
      {
        after: 2, id: 'b', title: 'The flooded level',
        text: '**Day 37, evening.** Tunnel vermin swarm through a flooded level between the stacks and the map room. It is a tempo scene: wet, loud, exhausting. A bridge of shelving, a rope, a pump to run. Not a place to learn lore.',
      },
    ],
  },
  // ---------------------------------------------------------------- 9
  {
    day: 'Day 38 (night) to Day 41.',
    before: 'The party has read the map and is deciding what it means.',
    offscreen: 'The salvage crew arrives on Day 39 and an ORS salvage officer wants credit for the find. A Cinder cell may hear of it through a courier. The Vigil Keeper at the Ramapo chapel is asked to hand over old liturgical records.',
    ends: 'The party has decided who is told, and carries leverage with every faction at once.',
    bible: '§7.2 the nine-rayed disk (do not explain it prematurely); §2.1 the nine Embers (history, not current status); §9.2 the Old Relay marks; §10.3 session 9 (the nine-rayed Vigil symbol may click for players); §13 the reveal matrix.',
    beats: {
      1: '**Day 38, night.** The map proves nine first lights, long ago. It says nothing about whether any other still burns. Nobody in Solmourn knows other Embers existed. Let the players get from "nine" to "nine cities" on their own.',
      2: '**Day 39.** The lamps on the stair belong to the ORS salvage crew, or to a Cinder cell that wants the same thing. They are not here to chat. The aim is to keep or copy the map and leave.',
      3: '**Day 40.** The chapel liturgy lists nine "virtues" that sound like place names. The Keeper is shaken but does not understand why. Mother Corven (WORKING) is not present; her hierarchy would not welcome this.',
      4: '**Day 41.** Whatever the party decides, it spreads or stays quiet in a particular way. Public disclosure moves unrest sharply. Giving the map to the Imperium means Seraphine learns the nine existed, which she did not know before.',
    },
    add: [
      {
        after: 1, id: 'a', title: 'Matching the marks',
        text: '**Day 38, late night.** Bring out what the party already holds: the chapel disk from session 6, the marks on the Old Relay casing if they saw them, the survey marker\'s "1 of 9". Players who put the nine rays against the nine marks should be left alone to enjoy it (clu-nine-rays, clu-relay-match). If they miss it, a Keeper or Mara can nudge them later.',
      },
      {
        after: 2, id: 'b', title: 'The rooftop chase',
        text: '**Day 39, night.** Pursuit across rooftops and skyways, five obstacles, each failure letting the pursuers close. If the party has Cinder help, a courier points a route. If not, locals will not stop them but will not help either. A Legionary squad at the last obstacle is only for a larger table.',
      },
    ],
  },
  // ---------------------------------------------------------------- 10
  {
    day: 'Day 47 to Day 52, a week after the map. The city is colder than before.',
    before: 'The party holds a secret, or has handed it on. They are looking for the next question, not the last.',
    offscreen: 'Day 44: ORS Director Thane (WORKING name) reads the salvage report about the archive and opens a quiet inquiry into "unauthorized historical material". The Chancery restricts access to the sealed annex in the Underways. Day 46: the Everflame dims briefly in one district and is not noticed outside it.',
    ends: 'The party has a pattern they noticed themselves, written down in their own words.',
    bible: '§1.3 False Dawns; §2.2 Aureth\'s limited theoretical suspicion (not known here); §10.2 #6; §10.3 session 10 (nobody can simply explain Concordance).',
    beats: {
      1: '**Day 47.** The records are scattered across centuries: Stewardship vault logs, Vigil notes, annex files. Each is an incident of warmth and light with no cause, followed by "unexplained, no further action".',
      2: '**Day 49.** The annex still logs instruments that do strange things. The air here makes sound and balance unreliable. Dissonance pockets are hazards, not creatures.',
      3: '**Day 51.** Witnesses disagree about every detail but one: they were together and frightened, and trying to save each other.',
      4: '**Day 52.** The pattern is something a player says aloud. Write it down in their words and do not confirm or deny it.',
    },
    add: [
      {
        after: 1, id: 'a', title: 'The block where it happened',
        text: '**Day 48.** A Frostward block where a brief warmth was reported long ago. Elderly residents remember it as a story told by their parents: a night when the heat came back for eleven minutes and a crowd stood in the street. The block is real and ordinary, and the party may be the first to take the story seriously.',
      },
    ],
  },
  // ---------------------------------------------------------------- 11
  {
    day: 'Day 55 to Day 57 (preparation, then the attempt on the night of Day 57).',
    before: 'The party has a hypothesis and the allies to test it, or has chosen to go alone.',
    offscreen: 'Thane\'s inquiry notices unusual gatherings and sends an ORS Resonant enforcer to observe. The enforcer is sincere and believes this should belong to the Empress. If the party has invited the Imperium, the enforcer is an observer, not a raider.',
    ends: 'The party has a partial understanding that is theirs, not a spell on a sheet. They may also have a damaged relationship.',
    bible: '§1.3 Concordance (completely lost; the party earns insight); §1.4 no automatic Unbound; §5.3 PLAYTEST rules; §10.3 session 11.',
    beats: {
      1: '**Day 55.** Everyone must be willing. Different disciplines, different devices and people with no Resonance at all take part. Anyone coerced destabilizes the attempt (clu-coercion-fails).',
      2: '**Day 57, night.** Three stages. Describe sensation and consequence, not theory. Use the Collective experiment tracker (PLAYTEST) only to record what the party observes.',
      3: '**Day 57, mid-attempt.** The enforcer arrives. Whatever the party chose beforehand decides whether this is an interruption, an argument or a conversation.',
      4: '**Day 58, morning.** Record observations only. Do not name the phenomenon for the players.',
    },
    add: [
      {
        after: 1, id: 'a', title: 'Preparing the room',
        text: '**Day 56.** Pick the site (reservoir gallery, chapel, annex), plan fallbacks and decide who knows. Arguments are useful here: who is allowed to stand in the circle, who is not, and what the party will do if it goes wrong. Short, tense, character-driven.',
      },
      {
        after: 3, id: 'b', title: 'What it cost',
        text: '**Day 58.** The cost lands: exhaustion, a lost ally, an injured participant, a damaged device. Failure teaches as much as success. Do not gate the campaign on these rolls.',
      },
    ],
  },
  // ---------------------------------------------------------------- 12
  {
    day: 'Day 60 to Day 63.',
    before: 'The party understands something and must decide whether to look outward.',
    offscreen: 'Dr. Senn finds parts. The Cinders debate the risk of powering a long-range stage. An ORS watch officer is told to "keep an eye" on the workshop and does so inefficiently.',
    ends: 'The relay has been tried, surrendered or left; the party has looked at the sky.',
    bible: '§9.2 the Old Relay (optional, difficult, may fail, never a rescue); §2.3 contact is uncertain; §1.1 the natural sun was not destroyed; §10.3 session 12.',
    beats: {
      1: '**Day 60.** Have the players say what they know. Correct only what their characters have actually seen.',
      2: '**Days 61 to 62.** A skill challenge over two nights: five successes before three failures, across at least three different PCs. Nobody alive has switched on the long-range stage.',
      3: '**Day 63, night.** The dome\'s instruments point at a sky everyone knows is empty. One reading does not agree.',
      4: '**Day 63, dawn.** The relay answers, or it does not. Whatever comes back is partial and uncertain.',
    },
    add: [
      {
        after: 2, id: 'a', title: 'Getting into the dome',
        text: '**Day 62.** The observation dome above the Gilded Ring needs access. A reformist Keeper, a Stewardship clerk, a bribe, a forged pass or an old service stair will each work. This is a small infiltration with a real cost if it goes wrong.',
      },
    ],
  },
  // ---------------------------------------------------------------- 13
  {
    day: 'Day 65 (the surge at about 17:30, the station hold that night) and Day 66 (the audience).',
    before: 'The party carries knowledge the Imperium would value.',
    offscreen: 'Day 63: Dr. Veyr tells Seraphine the projection: months, not years. She centralizes reserves and orders emergency measures drafted. Day 64: the Chancery readies orders; General Voss (WORKING name) places the Legions on alert. Aurelia argues for gentler means and obeys. Lucien wants a decisive blow. Lord Hadrian wants the Core sealed.',
    ends: 'The party has been courted or hunted. They know the Empress\'s terms and have answered them.',
    bible: '§4.1 and §4.2 (failing, with real policy choices); §6.2 Seraphine\'s character anchor; §6.3 House Vael is united; §8.4 the power curve; §10.3 session 13.',
    beats: {
      1: '**Day 65, about 17:30.** The Everflame dims visibly for the first time in living memory. For three breaths nobody in 54 million moves. Then the city talks.',
      2: '**Day 65, night.** Five rounds of machinery, constructs and heat in a Crown capture station. The station must hold until the surge passes.',
      3: '**Day 66.** The summons is by message, audience or an Ascendant at the door, according to the party\'s standing.',
      4: '**Day 66, audience.** Seraphine offers terms calmly and means them. She does not shout and does not bluff. "Mercy is mine to grant. It is not yours to presume."',
    },
    add: [
      {
        after: 2, id: 'a', title: 'After the surge',
        text: '**Day 65, late night.** Silence in the street, then sermons. Mother Corven (WORKING name) addresses the city. Reformist Keepers say warmth belongs to everyone. Orthodox Keepers preach endurance. Frostward residents ask the party what it saw, whatever it did.',
      },
    ],
  },
  // ---------------------------------------------------------------- 14
  {
    day: 'Day 66 to Day 69.',
    before: 'The party has answered the Empress, or refused her.',
    offscreen: 'The Imperium moves on its own plan: stockpiles are secured, ORS arrests increase, Ascendant houses are placed on alert. The Cinders argue over whether to commit or hide. Every ally names a condition.',
    ends: 'A plan with names on it and a visible clock.',
    bible: '§4.3 endgame solutions (OPEN); §8.2 Ascendancy (a top Ascendant is not an ordinary boss, but a prepared party can now challenge one); §10.3 session 14 (alternatives and costs must be legible).',
    beats: {
      1: '**Day 66, night.** Lay each option out with its price: time, people at risk, materials and coalition. No column is empty.',
      2: '**Days 67 to 68.** Gather people, parts and access. Each ally has a condition. Lucien wants a decisive blow; Mara wants a city left to live in.',
      3: '**Day 68, night.** An Ascendant with two Sanctum Guards. With preparation, allies and terrain the party can win, drive them off or turn them.',
      4: '**Day 69.** The plan is fixed and the clock is visible to the players as fiction.',
    },
    add: [
      {
        after: 3, id: 'a', title: 'The night before',
        text: '**Day 69, night.** A last quiet scene. Each PC speaks to someone they are afraid of losing. The city is cold and awake. Nothing mechanical happens; it is the last time anyone can say it.',
        readAloud: 'The night before is quiet in the way a held breath is quiet. Somewhere in the Sanctum a bell is rung for an hour that is not yet over. Somewhere in Frostward, a window you cannot see is lit.',
      },
    ],
  },
  // ---------------------------------------------------------------- 15
  {
    day: 'Day 70, from first light to the last candle. The epilogue is a year later.',
    before: 'The plan is committed. The party has done what it could to prepare.',
    offscreen: 'Whatever the party arranged is in motion. Rival plans move too. Everyone the party saved or failed is somewhere in the Sanctum approaches in some form.',
    ends: 'An ending the table chose. No ending is correct.',
    bible: '§4.3 endgame solutions are OPEN; §10.3 session 15 (do not force one restoration or political ending); §1.4 the Unbound is not assigned; §14.3 agency.',
    beats: {
      1: '**Day 70, first light.** Recap the truth as the party understands it. The causeway is a kilometre long and full of people.',
      2: '**Day 70, morning.** Whatever the plan needed is spent here: parts, people, promises, favours, lives.',
      3: '**Day 70, midday.** Three linked challenges of three to five rounds each: one social, one engineering, one collective if earned. Different PCs lead each.',
      4: '**Day 70 and a year later.** Ask each player for one image of the city a year on.',
    },
    add: [
      {
        after: 3, id: 'a', title: 'What the light costs',
        text: '**Day 70, evening.** The immediate aftermath. Count the dead, the saved and the changed. Whatever has happened to the Everflame, the sun, the Empress or the regime is now visible. This is the scene where the epilogue questions are asked.',
      },
    ],
  },
];

/** The "when and what else is happening" block added to each session's prep card. */
export function timelineBlock(i: number): string {
  const c = CHRONO[i];
  return `**When (WORKING chronology, ~10 weeks in all):** ${c.day}\n\n**Where the party is coming from:** ${c.before}\n\n**Meanwhile, off-screen:** ${c.offscreen}\n\n**State at the end of the session:** ${c.ends}\n\n**Story Bible anchors:** ${c.bible}`;
}

export interface MergedScene { id: string; title: string; descriptionMd: string; readAloudMd: string }
/** Existing scenes in order, with beat details appended and extra scenes slotted in story order. */
export function mergeScenes(i: number, scenes: [string, string, string?][]): MergedScene[] {
  const c = CHRONO[i];
  const out: MergedScene[] = [];
  scenes.forEach(([title, text, ra], j) => {
    const n = j + 1;
    const beat = c.beats?.[n];
    out.push({ id: `scn-${i + 1}-${n}`, title, descriptionMd: beat ? `${text}\n\n${beat}` : text, readAloudMd: ra || c.readAloud?.[n] || '' });
    for (const a of (c.add ?? []).filter((x) => x.after === n)) {
      out.push({ id: `scn-${i + 1}-${a.id}`, title: a.title, descriptionMd: a.text, readAloudMd: a.readAloud ?? '' });
    }
  });
  return out;
}

// ---------------- Calendar (lore) ----------------
export const calendarLore: LoreEntry = {
  ...base('lore-campaign-calendar', `${bib('10.2, 10.3, 10.4')}; Owner decision 2026-11-18 (about 10 weeks); chronology authored for the app (not yet approved)`, 'WORKING'),
  title: 'Campaign calendar: the 15 sessions in story order',
  category: 'Campaign chronology (WORKING)',
  canonStatus: 'WORKING',
  visibility: 'DM_ONLY',
  tags: ['chronology', 'calendar', 'working'],
  order: 3000,
  playerMd: '',
  bodyMd: `**Status: WORKING.** The Bible fixes the order of events but not how many days pass (§10.2, §10.3). The owner chose a span of about ten weeks on 2026-11-18. Day 1 is the Exchange 17 blackout. Change any day in the app; nothing here is canon.

| Day | Session | What happens in public | What happens off-screen |
|---|---|---|---|
| 1 | 1 Blackout in Frostward | Heat fails in Frostward; seven workers vanish; the broadcast says nobody was hurt | Regulator trips; gallery collapses; two workers are taken by security; sign-in board is wiped |
| 1 to 2 | 2 Cold Arteries | The party enters Exchange 17 and reaches the trapped workers | Foreman reports "equipment failure"; the two detained are moved to the precinct |
| 3 to 7 | 3 Competing Stories | Three explanations; the booking ledger; the independent test; the transfer; the substation | A quiet Stewardship inspector finds the weld; the ORS asks for the two workers |
| 11 to 12 | 4 Beneath the Foundries | The party sees the grid-wide failure and perhaps the Cinders | Capture output dips; ORS asks about "unregistered couriers" |
| 19 to 22 | 5 Load Shedding | A hearing, a reservoir and a leaked draft | Chancellor Saren asks for options costed by district; Legions told to secure the reservoir |
| 28 | 6 The Mercy Decree | About 84,000 residents are told they have six hours | Seraphine approves the order on Day 26; privileged districts keep redundant feeds |
| 29 to 35 | 7 After the Decree | Consequences, then a journey across the outer ring | Wanted notices for open defiers; ORS interviews suspected collaborators |
| 36 to 38 | 8 The Buried Archive | The map room and the overlay | A salvage crew follows a day behind |
| 38 to 41 | 9 Nine Rays | Interpretation, a chase, the chapel liturgy, the question of who is told | The ORS salvage officer wants credit; a Cinder cell hears of it |
| 47 to 52 | 10 Anomalies | Records, instruments and witnesses of False Dawns | Thane opens a quiet inquiry; the annex is restricted |
| 55 to 58 | 11 The Experiment | Preparation, the attempt, the enforcer | An ORS enforcer observes unusual gatherings |
| 60 to 63 | 12 Signal and Silence | The relay and the dome | Dr. Senn finds parts; the Cinders debate the risk |
| 65 to 66 | 13 The Flame Falters | The Everflame dims; a station holds; the Empress states her terms | Veyr gives Seraphine a projection of months; the Chancery readies emergency orders |
| 66 to 69 | 14 Lines Drawn | A plan chosen; allies named; an Ascendant met | Stockpiles secured; ORS arrests increase; Ascendant houses on alert |
| 70 | 15 What Survival Costs | The decisive day and the epilogue | Rival plans move; everyone the party saved or failed is nearby |

## Pacing rules
- **Heat clocks move for fiction, not for the calendar** (Bible §10.4). The days are a guide for describing time passing; no timer advances the Everflame.
- **Gaps between sessions** (Days 8 to 10, 13 to 18, 23 to 27, 42 to 46, 53 to 54, 59, 64) are downtime. The party can prepare, rest, travel or be interrupted.
- **If the party moves faster or slower**, slide the dates. Nothing off-screen is a deadline except what the table has seen.

## Reveal pacing (Bible §13)
- **Sessions 1 to 5:** the Everflame is failing, ringism and unequal allocation, the Cinders as rumour, the nine-rayed disk as scenery.
- **Sessions 6 to 7:** the Mercy Decree and its consequences.
- **Sessions 8 to 9:** the old name of the city, the nine lights, the nine rays. History, not present status.
- **Sessions 10 to 12:** the lost collective phenomenon, earned. The relay is optional and may fail.
- **Sessions 13 to 15:** the Everflame crisis and an open ending.`,
};

// ---------------- The six working names ----------------
const worker = (id: string, name: string, role: string, group: string, extra: Partial<NPC>): NPC => ({
  ...base(id, `${OWNER}; working name added 2026-11-18`, 'WORKING'), name, role, tags: ['exchange-17', 'missing', 'working-name'], publicInfoMd: '',
  wants: '', fears: '', knowsMd: '', mistakenBeliefsMd: '', relationship: '', lastSeen: '', status: 'MISSING', visibility: 'DM_ONLY', ...extra,
  privateInfoMd: `**WORKING name; species and appearance OPEN.** One of ${group} (see the LOCKED group record). ${extra.privateInfoMd ?? ''}`,
});
export const workerNpcs: NPC[] = [
  worker('npc-w-odalys', 'Odalys Brandt', 'Night-shift lead, Exchange 17', 'the four trapped workers', { publicInfoMd: 'Led the night shift at Exchange 17.', privateInfoMd: 'Steady and practical; a crushed wrist. Always worked nights in the lower gallery. Knows the shift order and what the withdrawn report said.', wants: 'Her crew out alive.', fears: 'Being blamed for a failure she warned about.' }),
  worker('npc-w-kofi', 'Kofi Marlowe', 'Apprentice, Exchange 17', 'the four trapped workers', { publicInfoMd: 'An apprentice in his third week.', privateInfoMd: 'Leg pinned in the collapse and the first to go hypothermic. His mother waits at the fence with a flask of tea.', wants: 'To go home.', fears: 'The cold.' }),
  worker('npc-w-renske', 'Renske Aldous', 'Pump technician, Exchange 17', 'the four trapped workers', { publicInfoMd: 'A pump technician.', privateInfoMd: 'Kept the logs on a slate and wants them to survive. Can testify to the deferred repairs.', wants: 'The record kept.', fears: 'The logs being sealed.' }),
  worker('npc-w-davit', 'Davit Sorrel', 'Maintenance worker, Exchange 17', 'the four trapped workers', { publicInfoMd: 'A maintenance worker.', privateInfoMd: 'Barely speaks since the collapse. He saw which way Ilan Rook went.', wants: 'To get out.', fears: 'Being asked what he saw.' }),
  worker('npc-w-ines', 'Ines Calloway', 'Control-gantry technician, Exchange 17', 'the two detained workers', { publicInfoMd: 'A control-gantry technician.', privateInfoMd: 'Read the withdrawn report aloud at a shift change a week before the blackout. Frightened and angry.', wants: 'To be heard.', fears: 'ORS holding.' }),
  worker('npc-w-hamid', 'Hamid Reyes', 'Inspector, Exchange 17', 'the two detained workers', { publicInfoMd: 'An inspector at Exchange 17.', privateInfoMd: 'Argued with the office about the report. Calm and trusts that paperwork will protect him.', wants: 'His report acknowledged.', fears: 'That paperwork will not protect him.' }),
];
