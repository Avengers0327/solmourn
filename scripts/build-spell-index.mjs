// Builds the app's spell METADATA inventory by merging two independent sources:
//   1. the SRD 5.1 spell data (official SRD content, CC-BY-4.0), and
//   2. a public third-party spell index (names, levels, schools, casting times, ranges, durations,
//      component letters and the books each spell is listed in). Spell descriptions from that
//      index are never read, and material-component text is dropped.
// Spells are deduplicated across books. Where the sources disagree the disagreement is recorded
// (never silently resolved). Unearthed Arcana playtest entries are kept, flagged, and excluded.
// Usage: node scripts/build-spell-index.mjs <srd-spells.json> <index-meta.json>
import { readFileSync, writeFileSync } from 'node:fs';

const srd = JSON.parse(readFileSync(process.argv[2], 'utf8')).data.spells;
const meta = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const norm = (n) => n.toLowerCase().replace(/\(ua\)/g, '').replace(/[^a-z]+/g, '');
const kebab = (n) => n.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const SMALL = new Set(['of', 'the', 'and', 'to', 'from', 'with', 'in', 'on']);
const title = (n) => n.replace(/\s*\(UA\)\s*$/i, '').split(' ').map((w, i) => (i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w)).join(' ');

const BOOKS = {
  "Player's Handbook": 'PHB', "Xanathar's Guide to Everything": 'XGE', "Tasha's Cauldron of Everything": 'TCE', "Explorer's Guide to Wildemount": 'EGW',
  'Acquisitions Inc.': 'AI', "Fizban's Treasury of Dragons": 'FTD', 'Strixhaven: A Curriculum of Chaos': 'SCC', 'Lost Laboratory of Kwalish': 'LLK',
  'The Book of Many Things': 'BMT', 'Icewind Dale - Rime of the Frostmaiden': 'IDRF', "Spelljammer: Adventures in Space - Astral Adventurer's Guide": 'AAG',
  'Planescape - Adventures in the Multiverse': 'PAM', "Guildmaster's Guide to Ravnica": 'GGR', 'Elemental Evil Player\'s Companion': 'EEPC', 'Sword Coast Adventurer\'s Guide': 'SCAG',
};
const bookCodes = (list) => {
  const codes = [];
  let ua = false;
  for (const entry of list) for (const part of entry.split('/')) {
    const p = part.trim();
    if (/^Unearthed Arcana/.test(p)) { ua = true; continue; }
    const code = BOOKS[p];
    if (!code) throw new Error(`Unknown source book: "${p}"`);
    if (!codes.includes(code)) codes.push(code);
  }
  return { codes, ua };
};
const lvl = (l) => (/cantrip/i.test(l) ? 0 : +((/(\d)(?:st|nd|rd|th)/i.exec(l) || [])[1] ?? -1));
const school = (l) => {
  const s = (/(abjuration|conjuration|divination|enchantment|evocation|illusion|necromancy|transmutation)/i.exec(l) || [])[1];
  return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : '';
};
const tags = (l) => [...l.matchAll(/\(([^)]+)\)/g)].map((m) => m[1].toLowerCase()).filter((t) => t !== 'ritual');
const letters = (c) => [...new Set((/^[VSM,\s]+/.exec(c.trim()) || [''])[0].match(/[VSM]/g) ?? [])].join(', ');

// SRD uses generic names for spells whose published names carry a wizard's name.
const CROSSWALK = {
  'Acid Arrow': "Melf's Acid Arrow", 'Arcane Hand': "Bigby's Hand", 'Arcane Sword': "Mordenkainen's Sword", "Arcanist's Magic Aura": "Nystul's Magic Aura",
  'Black Tentacles': "Evard's Black Tentacles", 'Faithful Hound': "Mordenkainen's Faithful Hound", 'Floating Disk': "Tenser's Floating Disk",
  'Freezing Sphere': "Otiluke's Freezing Sphere", 'Hideous Laughter': "Tasha's Hideous Laughter", 'Instant Summons': "Drawmij's Instant Summons",
  'Irresistible Dance': "Otto's Irresistible Dance", 'Magnificent Mansion': "Mordenkainen's Magnificent Mansion", 'Private Sanctum': "Mordenkainen's Private Sanctum",
  'Resilient Sphere': "Otiluke's Resilient Sphere", 'Secret Chest': "Leomund's Secret Chest", 'Telepathic Bond': "Rary's Telepathic Bond", 'Tiny Hut': "Leomund's Tiny Hut",
};
const srdByKey = new Map(srd.map((s) => [norm(CROSSWALK[s.name] ?? s.name), s]));

// Casting times sometimes carry a reaction trigger sentence. That is description text: keep only the time.
const baseTime = (t) => t.replace(/,\s*(which|taken)\b.*$/i, '').replace(/\s+/g, ' ').trim();
const nt = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const merged = new Map();
for (const r of meta.rows) {
  const key = norm(r.name);
  const { codes, ua } = bookCodes(r.sources);
  const prev = merged.get(key);
  if (prev) {
    // The same spell listed twice (e.g. a playtest version and the final one): keep the official row.
    if (prev.ua && !ua) merged.set(key, { r, codes, ua, hadUA: true });
    else prev.hadUA = prev.hadUA || ua;
    continue;
  }
  merged.set(key, { r, codes, ua, hadUA: false });
}

const out = [];
const stats = { srd: 0, discrepancies: 0 };
for (const [key, { r, codes, ua, hadUA }] of merged) {
  const s = srdByKey.get(key);
  const level = lvl(r.levelLine);
  const sc = school(r.levelLine);
  if (level < 0 || !sc) throw new Error(`Cannot parse level/school for ${r.name}: "${r.levelLine}"`);
  const df = [];
  if (s) {
    stats.srd++;
    if (s.level !== level) df.push(`level: SRD ${s.level}, index ${level}`);
    if (s.school.name !== sc) df.push(`school: SRD ${s.school.name}, index ${sc}`);
    if (!!s.concentration !== /concentration/i.test(r.duration)) df.push(`concentration: SRD ${!!s.concentration}, index ${/concentration/i.test(r.duration)}`);
    if (!!s.ritual !== /ritual/i.test(r.levelLine)) df.push(`ritual: SRD ${!!s.ritual}, index ${/ritual/i.test(r.levelLine)}`);
    if (!nt(r.time).startsWith(nt(s.casting_time).replace(/ or .*/, ''))) df.push(`casting time: SRD "${s.casting_time}", index "${r.time}"`);
    if (!nt(r.range).startsWith(nt(s.range))) df.push(`range: SRD "${s.range}", index "${r.range}"`);
    if (!codes.includes('PHB')) df.push('SRD spell not listed under the Player\'s Handbook in the index');
    stats.discrepancies += df.length ? 1 : 0;
  }
  const dur = r.duration.replace(/^concentration,?\s*/i, '').trim();
  out.push({
    k: kebab(s ? s.name : title(r.name)), n: title(r.name), l: level, sc, t: baseTime(r.time), r: r.range, d: dur || r.duration, c: /concentration/i.test(r.duration),
    ri: /ritual/i.test(r.levelLine), co: letters(r.components), bk: codes, srd: s ? s.index : null, ua, uaVariant: hadUA && !ua, tg: tags(r.levelLine), df,
  });
}
// Every SRD spell must have been matched: nothing silently dropped.
const unmatched = srd.filter((s) => !merged.has(norm(CROSSWALK[s.name] ?? s.name)));
if (unmatched.length) throw new Error(`SRD spells without an index match: ${unmatched.map((s) => s.name).join(', ')}`);
out.sort((a, b) => a.l - b.l || a.n.localeCompare(b.n));
writeFileSync('src/content/spells.index.json', JSON.stringify({ fetchedAt: meta.fetchedAt, indexSource: 'dnd5e.wikidot.com (third-party, unofficial)', rows: out }));
const by = (f) => out.filter(f).length;
console.log(`rows ${out.length}; official ${by((x) => !x.ua)}; UA-only ${by((x) => x.ua)}; SRD matched ${stats.srd}; SRD rows with discrepancies ${stats.discrepancies}`);
for (const x of out.filter((o) => o.df.length)) console.log(' ', x.n, '=>', x.df.join('; '));
